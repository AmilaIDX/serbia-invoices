import { Link } from "react-router-dom";

const InvoiceTable = ({ invoices = [] }) => {
  if (!invoices.length) {
    return <div className="card glass">No invoices yet.</div>;
  }

  return (
    <div className="card glass">
      <table className="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Total</th>
            <th>VAT</th>
            <th>Status</th>
            <th>Due</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                <Link className="link" to={`/invoices/${inv.id}`}>
                  {inv.invoice_number || `#${inv.id}`}
                </Link>
              </td>
              <td>
                <div>{inv.client_name}</div>
                <div className="muted">{inv.client_email}</div>
              </td>
              <td>{Number(inv.total || 0).toFixed(2)}</td>
              <td>{Number(inv.vat || 0).toFixed(2)}</td>
              <td>
                <span className="badge">{inv.status || "pending"}</span>
              </td>
              <td className="muted">{inv.due_date?.slice(0, 10) || "—"}</td>
              <td>
                <Link className="btn secondary" to={`/invoices/${inv.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
