import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../services/api";

const CreateClientPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", address: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await createClient(form);
      navigate(`/clients/${created.id}`);
    } catch (err) {
      setError(err.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <h1 className="page-title">Create Client</h1>
      <form className="card glass grid" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-control">
            <label>Name</label>
            <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </div>
          <div className="form-control">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Address</label>
            <input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
        </div>
        {error && <div className="danger">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
      </form>
    </div>
  );
};

export default CreateClientPage;
