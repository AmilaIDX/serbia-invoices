import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClients } from "../services/api";

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const data = await getClients();
        setClients(data);
      } catch (err) {
        setError(err.message || "Failed to load clients");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Clients</h1>
        <Link className="btn" to="/clients/create">
          New Client
        </Link>
      </div>
      {error && <div className="danger">{error}</div>}
      {loading ? (
        <div className="card glass">Loading...</div>
      ) : (
        <div className="card glass">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.email}</td>
                  <td>{client.phone}</td>
                  <td>
                    <Link className="btn secondary" to={`/clients/${client.id}`}>
                      View
                    </Link>
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

export default ClientsPage;
