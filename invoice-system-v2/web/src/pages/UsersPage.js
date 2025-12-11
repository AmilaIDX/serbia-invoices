import { useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../services/api";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createUser(form);
      setForm({ name: "", email: "", password: "", role: "admin" });
      await load();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (id, role) => {
    await updateUser(id, { role });
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await deleteUser(id);
    await load();
  };

  return (
    <div className="grid">
      <h1 className="page-title">Users</h1>
      {error && <div className="danger">{error}</div>}
      <div className="card glass grid">
        <h3 style={{ margin: 0 }}>Create User</h3>
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-control">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-control">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-control">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="form-control">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create"}
          </button>
        </form>
      </div>
      {loading ? (
        <div className="card glass">Loading users...</div>
      ) : (
        <div className="card glass">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select value={user.role} onChange={(e) => handleUpdateRole(user.id, e.target.value)}>
                      <option value="admin">admin</option>
                      <option value="user">user</option>
                    </select>
                  </td>
                  <td className="table-actions">
                    <button className="btn secondary" onClick={() => handleDelete(user.id)}>
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

export default UsersPage;
