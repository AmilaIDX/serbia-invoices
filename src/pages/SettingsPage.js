import { useEffect, useState } from "react";
import { getSettings, updateSettings, getCurrentUser, updateCurrentUser } from "../services/api";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    company_name: "",
    company_address: "",
    company_logo: "",
    default_terms: "",
    default_due_offset: "7",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState({ name: "", email: "", phone: "", password: "" });
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        setSettings((prev) => ({ ...prev, ...data }));
        const me = await getCurrentUser();
        setUser((prev) => ({ ...prev, ...me }));
      } catch (err) {
        setError(err.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateSettings(settings);
      setSettings((prev) => ({ ...prev, ...updated }));
      setMessage("Settings saved");
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateCurrentUser(user);
      setUser((prev) => ({ ...prev, ...updated, password: "" }));
      setMessage("User updated");
    } catch (err) {
      setError(err.message || "Failed to update user");
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="grid">
      <h1 className="page-title">Settings</h1>
      <div className="card grid">
        <h2 style={{ margin: 0 }}>My Profile</h2>
        <form className="form-grid" onSubmit={handleSaveUser}>
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
          <button className="btn" type="submit" disabled={savingUser}>
            {savingUser ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
      <form className="card grid" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-control">
            <label>Company name</label>
            <input
              value={settings.company_name || ""}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>Company address</label>
            <input
              value={settings.company_address || ""}
              onChange={(e) => handleChange("company_address", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>Logo URL</label>
            <input value={settings.company_logo || ""} onChange={(e) => handleChange("company_logo", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Default invoice terms</label>
            <textarea
              value={settings.default_terms || ""}
              onChange={(e) => handleChange("default_terms", e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-control">
            <label>Default due date offset (days)</label>
            <input
              type="number"
              value={settings.default_due_offset || 7}
              onChange={(e) => handleChange("default_due_offset", e.target.value)}
            />
          </div>
        </div>
        {message && <div className="muted">{message}</div>}
        {error && <div className="danger">{error}</div>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;
