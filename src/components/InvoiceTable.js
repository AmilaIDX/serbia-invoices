import { Link } from "react-router-dom";

const InvoiceTable = ({ invoices = [] }) => {
  if (!invoices.length) {
    return <div className="card">No invoices yet.</div>;
  }

  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Total (LKR)</th>
            <th>Status</th>
            <th>Due</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                <Link className="link" to={`/invoice/${inv.id}`}>
                  {inv.invoice_number || `#${inv.id}`}
                </Link>
              </td>
              <td>
                <div>{inv.client_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {inv.client_email}
                </div>
              </td>
              <td>LKR {Number(inv.total_amount || inv.amount || 0).toFixed(2)}</td>
              <td>
                <span className="badge">{inv.status || "pending"}</span>
              </td>
              <td className="muted">{inv.due_date?.slice(0, 10) || "—"}</td>
              <td className="muted">{inv.created_at?.slice(0, 19)?.replace("T", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
