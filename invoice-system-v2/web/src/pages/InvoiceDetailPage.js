import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteInvoice, getInvoice, updateInvoice, getInvoicePdf } from "../services/api";
import InvoiceForm from "../components/InvoiceForm";

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setError("");
    try {
      const data = await getInvoice(id);
      setInvoice(data);
    } catch (err) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (payload) => {
    const updated = await updateInvoice(id, payload);
    await load();
    return updated;
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    await deleteInvoice(id);
    navigate("/invoices");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const buffer = await getInvoicePdf(id);
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert(err.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="card glass">Loading...</div>;
  if (error) return <div className="danger">{error}</div>;
  if (!invoice) return <div className="card glass">Not found.</div>;

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Invoice {invoice.invoice_number || `#${invoice.id}`}</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn secondary" onClick={() => navigate(-1)}>
            Back
          </button>
          <button className="btn secondary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing..." : "PDF"}
          </button>
          <button className="btn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="card glass grid">
        <div className="form-grid">
          <div className="form-control">
            <label>Client</label>
            <div>{invoice.client_name}</div>
            <div className="muted">{invoice.client_email}</div>
            <div className="muted">{invoice.client_phone}</div>
          </div>
          <div className="form-control">
            <label>Dates</label>
            <div className="muted">Date: {invoice.date?.slice(0, 10)}</div>
            <div className="muted">Due: {invoice.due_date?.slice(0, 10) || "—"}</div>
          </div>
          <div className="form-control">
            <label>Totals</label>
            <div className="muted">Subtotal: {Number(invoice.subtotal || 0).toFixed(2)}</div>
            <div className="muted">VAT: {Number(invoice.vat || 0).toFixed(2)}</div>
          </div>
          <div className="form-control">
            <label>Total</label>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{Number(invoice.total || 0).toFixed(2)}</div>
          </div>
          <div className="form-control">
            <label>Status</label>
            <span className="badge">{invoice.status || "pending"}</span>
          </div>
        </div>
        <div className="grid">
          <h3 style={{ margin: 0 }}>Items</h3>
          <table className="line-items">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.unit_price || 0).toFixed(2)}</td>
                  <td>{Number(item.total || item.unit_price * item.quantity || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="muted">Notes: {invoice.notes || "None"}</div>
      </div>

      <h2 className="page-title">Update Invoice</h2>
      <InvoiceForm onSubmit={handleUpdate} initial={invoice} />
    </div>
  );
};

export default InvoiceDetailPage;
