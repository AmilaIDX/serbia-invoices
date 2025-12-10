import { useEffect, useState } from "react";
import { getCurrentUser, updateCurrentUser } from "../services/api";

const ProfilePage = () => {
  const [user, setUser] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser();
        setUser((prev) => ({ ...prev, ...me, password: "" }));
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateCurrentUser(user);
      setUser((prev) => ({ ...prev, ...updated, password: "" }));
      setMessage("Profile updated");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="grid">
      <h1 className="page-title">My Profile</h1>
      <form className="card grid" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-control">
            <label>Name</label>
            <input value={user.name || ""} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          </div>
          <div className="form-control">
            <label>Email</label>
            <input value={user.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} />
          </div>
          <div className="form-control">
            <label>Phone</label>
            <input value={user.phone || ""} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
          </div>
          <div className="form-control">
            <label>New password</label>
            <input
              type="password"
              value={user.password || ""}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </div>
        </div>
        {message && <div className="muted">{message}</div>}
        {error && <div className="danger">{error}</div>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
