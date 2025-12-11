import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteInvoice, getInvoices, getInvoicePdf } from "../services/api";

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setError("");
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      load();
    } catch (err) {
      setError(err.message || "Failed to delete invoice");
    }
  };

  const handleDownload = async (id) => {
    try {
      const buffer = await getInvoicePdf(id);
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err.message || "Failed to download PDF");
    }
  };

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Invoices</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link className="btn" to="/invoices/create">
            Create Invoice
          </Link>
        </div>
      </div>
      {error && <div className="danger">{error}</div>}
      {loading ? (
        <div className="card glass">Loading...</div>
      ) : (
        <div className="card glass">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>Total</th>
                <th>Status</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number || `#${inv.id}`}</td>
                  <td>{inv.client_name}</td>
                  <td>{Number(inv.total || 0).toFixed(2)}</td>
                  <td>
                    <span className="badge">{inv.status || "pending"}</span>
                  </td>
                  <td className="muted">{inv.due_date?.slice(0, 10) || "—"}</td>
                  <td className="table-actions">
                    <button className="btn secondary" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      Open
                    </button>
                    <button className="btn secondary" onClick={() => handleDownload(inv.id)}>
                      PDF
                    </button>
                    <button className="btn" onClick={() => handleDelete(inv.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
