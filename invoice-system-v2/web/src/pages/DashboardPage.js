import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InvoiceTable from "../components/InvoiceTable";
import { getInvoices } from "../services/api";
import Charts from "../components/Charts";
import StatusWidgets from "../components/StatusWidgets";

const DashboardPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
    load();
  }, []);

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const revenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount || 0), 0);
    const pending = invoices.filter((i) => (i.status || "").toLowerCase() === "pending").length;
    const paid = invoices.filter((i) => (i.status || "").toLowerCase() === "paid").length;
    const overdue = invoices.filter((i) => (i.status || "").toLowerCase() === "overdue").length;
    return { totalInvoices, revenue, pending, paid, overdue };
  }, [invoices]);

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Dashboard</h1>
        <StatusWidgets />
      </div>
      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalInvoices}</div>
          <div className="stat-label">Total invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">LKR {stats.revenue.toFixed(2)}</div>
          <div className="stat-label">Total revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.paid}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link className="btn" to="/create">
            Create Invoice
          </Link>
        </div>
      </div>
      {error && <div className="danger">{error}</div>}
      {loading ? <div className="card">Loading...</div> : <InvoiceTable invoices={invoices} />}
      {!loading && <Charts invoices={invoices} />}
    </div>
  );
};

export default DashboardPage;
