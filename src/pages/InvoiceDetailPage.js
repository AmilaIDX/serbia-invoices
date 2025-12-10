import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteInvoice, getInvoice, updateInvoice, getInvoicePdf } from "../services/api";
import InvoiceForm from "../components/InvoiceForm";
import VisaTimeline from "../components/VisaTimeline";

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
    await updateInvoice(id, payload);
    await load();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    await deleteInvoice(id);
    navigate("/dashboard");
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

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="danger">{error}</div>;
  if (!invoice) return <div className="card">Not found.</div>;

  return (
    <div className="grid">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="page-title">Invoice {invoice.invoice_number || `#${invoice.id}`}</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn secondary" onClick={() => navigate(-1)}>
            Back
          </button>
          <button className="btn secondary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing PDF..." : "PDF"}
          </button>
          <button className="btn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="card grid">
        <div className="form-grid">
          <div className="form-control">
            <label>Client</label>
            <div>{invoice.client_name}</div>
            <div className="muted">{invoice.client_email}</div>
            <div className="muted">{invoice.client_address}</div>
          </div>
          <div className="form-control">
            <label>Dates</label>
            <div className="muted">Issued: {invoice.issue_date?.slice(0, 10)}</div>
            <div className="muted">Due: {invoice.due_date?.slice(0, 10) || "—"}</div>
          </div>
          <div className="form-control">
            <label>Status</label>
            <div className="badge">{invoice.status}</div>
          </div>
          <div className="form-control">
            <label>Total</label>
            <div style={{ fontSize: 24, fontWeight: 700 }}>LKR {Number(invoice.total_amount || 0).toFixed(2)}</div>
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
                {invoice.line_items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>LKR {Number(item.unit_price || 0).toFixed(2)}</td>
                    <td>LKR {Number(item.total || item.unit_price * item.quantity || 0).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="muted">Created: {invoice.created_at}</div>
      </div>

      <h2 className="page-title">Update</h2>
      <VisaTimeline
        timeline={invoice.timeline}
        onUpdate={(next) => handleUpdate({ ...invoice, timeline: next })}
      />
      <InvoiceForm onSubmit={handleUpdate} initial={invoice} />
    </div>
  );
};

export default InvoiceDetailPage;
