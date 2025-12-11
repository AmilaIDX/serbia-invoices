import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InvoiceTable from "../components/InvoiceTable";
import Charts from "../components/Charts";
import { getInvoices, getClients } from "../services/api";

const DashboardPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const [invData, clientData] = await Promise.all([getInvoices(), getClients()]);
        setInvoices(invData);
        setClients(clientData);
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const revenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const now = new Date();
    const pending = invoices.filter((i) => {
      const status = (i.status || "").toLowerCase();
      const due = i.due_date ? new Date(i.due_date) : null;
      if (status === "paid") return false;
      if (due && now > due) return false;
      return true;
    }).length;
    const paid = invoices.filter((i) => (i.status || "").toLowerCase() === "paid").length;
    const overdue = invoices.filter((i) => {
      const due = i.due_date ? new Date(i.due_date) : null;
      const status = (i.status || "").toLowerCase();
      return status !== "paid" && due && now > due;
    }).length;
    return { totalInvoices, revenue, pending, paid, overdue };
  }, [invoices]);

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link className="btn" to="/invoices/create">
            New Invoice
          </Link>
          <Link className="btn secondary" to="/clients/create">
            Add Client
          </Link>
        </div>
      </div>
      {error && <div className="danger">{error}</div>}
      <div className="stats">
        <div className="stat-card glass">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">{stats.revenue.toFixed(2)}</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label">Invoices</div>
          <div className="stat-value">{stats.totalInvoices}</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label">Clients</div>
          <div className="stat-value">{clients.length}</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label">Status</div>
          <div className="muted">
            {stats.paid} paid • {stats.pending} pending • {stats.overdue} overdue
          </div>
        </div>
      </div>
      {loading ? <div className="card glass">Loading...</div> : <InvoiceTable invoices={invoices.slice(0, 5)} />}
      {!loading && <Charts invoices={invoices} />}
    </div>
  );
};

export default DashboardPage;
