import { useEffect, useMemo, useState } from "react";
import { generateInvoiceNumber, getClients } from "../services/api";

const defaultIssue = () => new Date().toISOString().slice(0, 10);
const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

const InvoiceForm = ({ onSubmit, initial = {} }) => {
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number || "");
  const [clientName, setClientName] = useState(initial.client_name || "");
  const [clientAddress, setClientAddress] = useState(initial.client_address || "");
  const [clientEmail, setClientEmail] = useState(initial.client_email || "");
  const [issueDate, setIssueDate] = useState(initial.issue_date?.slice(0, 10) || defaultIssue());
  const [dueDate, setDueDate] = useState(initial.due_date?.slice(0, 10) || defaultDue());
  const [status, setStatus] = useState(initial.status || "pending");
  const [lineItems, setLineItems] = useState(
    initial.line_items?.length
      ? initial.line_items
      : [
          { description: "Service", quantity: 1, unit_price: 100, total: 100 },
        ]
  );
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await getClients();
        setClients(data);
      } catch {
        // ignore
      }
    };
    loadClients();
  }, []);

  const totals = useMemo(() => {
    const items = lineItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.quantity || 0) * Number(item.unit_price || 0),
    }));
    const sum = items.reduce((acc, item) => acc + item.total, 0);
    return { items, sum };
  }, [lineItems]);

  const setItem = (index, key, value) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addItem = () => setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (index) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleClientSelect = (id) => {
    const selected = clients.find((c) => c.id === Number(id));
    if (!selected) return;
    setClientName(selected.name || "");
    setClientAddress(selected.address || "");
    setClientEmail(selected.email || "");
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
      await onSubmit({
        invoice_number: finalNumber,
        client_name: clientName,
        client_address: clientAddress,
        client_email: clientEmail,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        line_items: totals.items,
        total_amount: totals.sum,
      });
    } catch (err) {
      setError(err.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card grid" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-control">
          <label>Invoice Number</label>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Issue Date</label>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="form-control">
          <label>Select Client</label>
          <select defaultValue="" onChange={(e) => handleClientSelect(e.target.value)}>
            <option value="">Pick existing client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div />
      </div>

      <div className="form-grid">
        <div className="form-control">
          <label>Client Name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div className="form-control">
          <label>Client Address</label>
          <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
        </div>
        <div className="form-control">
          <label>Client Email</label>
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
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
                    onChange={(e) => setItem(idx, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => setItem(idx, "quantity", e.target.value)}
                    min="0"
                    step="1"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => setItem(idx, "unit_price", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </td>
                <td>{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</td>
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

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="pill">Final Amount: LKR {totals.sum.toFixed(2)}</div>
        {error && <div className="danger">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;
