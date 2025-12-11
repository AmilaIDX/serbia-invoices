import { useEffect, useMemo, useState } from "react";
import { generateInvoiceNumber, getClients } from "../services/api";

const defaultDate = () => new Date().toISOString().slice(0, 10);
const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const InvoiceForm = ({ onSubmit, initial = {} }) => {
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number || "");
  const [clientId, setClientId] = useState(initial.client_id || "");
  const [clientName, setClientName] = useState(initial.client_name || "");
  const [clientEmail, setClientEmail] = useState(initial.client_email || "");
  const [clientPhone, setClientPhone] = useState(initial.client_phone || "");
  const [clientAddress, setClientAddress] = useState(initial.client_address || "");
  const [date, setDate] = useState(initial.date?.slice(0, 10) || defaultDate());
  const [dueDate, setDueDate] = useState(initial.due_date?.slice(0, 10) || defaultDue());
  const derivedVatRate =
    initial.subtotal && Number(initial.subtotal) > 0
      ? ((Number(initial.vat || 0) / Number(initial.subtotal)) * 100).toFixed(2)
      : initial.vat || 0;
  const [vat, setVat] = useState(initial.vat_rate || derivedVatRate || 0);
  const [notes, setNotes] = useState(initial.notes || "");
  const [lineItems, setLineItems] = useState(
    initial.items?.length ? initial.items : [{ description: "Service", quantity: 1, unit_price: 100 }]
  );
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getClients();
        setClients(data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadNumber = async () => {
      if (invoiceNumber) return;
      try {
        const data = await generateInvoiceNumber();
        setInvoiceNumber(data.invoice_number);
      } catch {
        // ignore
      }
    };
    loadNumber();
  }, [invoiceNumber]);

  const totals = useMemo(() => {
    const items = lineItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      vat_rate: Number(vat) || 0,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const vatAmount = subtotal * (Number(vat) / 100);
    const total = subtotal + vatAmount;
    return { items: items.map((i) => ({ ...i, total: i.quantity * i.unit_price })), subtotal, vat: vatAmount, total };
  }, [lineItems, vat]);

  const handleItemChange = (idx, key, value) => {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const addItem = () => setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (index) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleClientSelect = (id) => {
    setClientId(id);
    const selected = clients.find((c) => String(c.id) === String(id));
    if (selected) {
      setClientName(selected.name || "");
      setClientEmail(selected.email || "");
      setClientPhone(selected.phone || "");
      setClientAddress(selected.address || "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let finalNumber = invoiceNumber;
      if (!finalNumber) {
        const data = await generateInvoiceNumber();
        finalNumber = data.invoice_number;
        setInvoiceNumber(finalNumber);
      }
      const result = await onSubmit({
        invoice_number: finalNumber,
        client_id: clientId || undefined,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_address: clientAddress,
        date,
        due_date: dueDate,
        items: totals.items,
        notes,
      });
      if (result && result.subtotal !== undefined) {
        if (
          Math.round(result.subtotal * 100) !== Math.round(totals.subtotal * 100) ||
          Math.round(result.total * 100) !== Math.round(totals.total * 100)
        ) {
          setWarning("Server totals differ; please verify values.");
        } else {
          setWarning("");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card glass grid" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-control">
          <label>Invoice Number</label>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>VAT %</label>
          <input type="number" min="0" step="0.01" value={vat} onChange={(e) => setVat(e.target.value)} />
        </div>
        <div className="form-control">
          <label>Select Client</label>
          <select value={clientId} onChange={(e) => handleClientSelect(e.target.value)}>
            <option value="">New client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-control">
          <label>Client Name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Client Email</label>
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>
        <div className="form-control">
          <label>Client Phone</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
        <div className="form-control">
          <label>Client Address</label>
          <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
        </div>
      </div>

      <div className="grid">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Line Items</h3>
          <button type="button" className="btn secondary" onClick={addItem}>
            Add item
          </button>
        </div>
        <table className="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                  />
                </td>
                <td className="muted">{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => removeItem(idx)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="form-control">
        <label>Notes</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="pill">Subtotal: {totals.subtotal.toFixed(2)}</div>
        <div className="pill">VAT: {totals.vat.toFixed(2)}</div>
        <div className="pill accent">Total: {totals.total.toFixed(2)}</div>
        {warning && <div className="muted">{warning}</div>}
        {error && <div className="danger">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;
