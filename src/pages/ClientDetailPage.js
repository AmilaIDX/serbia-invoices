import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient, updateClient, deleteClient } from "../services/api";

const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const data = await getClient(id);
      setClient(data);
    } catch (err) {
      setError(err.message || "Failed to load client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (key, value) => setClient((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateClient(id, client);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this client?")) return;
    setDeleting(true);
    try {
      await deleteClient(id);
      navigate("/clients");
    } catch (err) {
      setError(err.message || "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="danger">{error}</div>;
  if (!client) return <div className="card">Not found.</div>;

  return (
    <div className="grid">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="page-title">{client.name}</h1>
        <button className="btn secondary" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
      <form className="card grid" onSubmit={handleSave}>
        <div className="form-grid">
          <div className="form-control">
            <label>Name</label>
            <input value={client.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Email</label>
            <input value={client.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Phone</label>
            <input value={client.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Address</label>
            <input value={client.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Applying From (Country)</label>
            <input
              value={client.applying_from || ""}
              onChange={(e) => handleChange("applying_from", e.target.value)}
            />
          </div>
        </div>
        {error && <div className="danger">{error}</div>}
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button className="btn secondary" type="button" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Client"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientDetailPage;
