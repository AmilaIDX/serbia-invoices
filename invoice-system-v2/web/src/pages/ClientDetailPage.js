import React, { useEffect, useState } from "react";
import { getClients, deleteClient } from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const all = await getClients();
        const found = all.find((c) => String(c.id) === String(id));
        setClient(found || null);
      } catch (err) {
        console.error("Failed to load client", err);
        setError("Failed to load client");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      await deleteClient(id);
      navigate("/clients");
    } catch (err) {
      console.error("Failed to delete client", err);
      alert("Failed to delete client");
    }
  };

  if (loading) return <div>Loading client...</div>;
  if (error) return <div>{error}</div>;
  if (!client) return <div>Client not found.</div>;

  return (
    <div>
      <h1>Client Detail</h1>
      <pre>{JSON.stringify(client, null, 2)}</pre>
      <button onClick={handleDelete}>Delete client</button>
    </div>
  );
};

export default ClientDetailPage;
