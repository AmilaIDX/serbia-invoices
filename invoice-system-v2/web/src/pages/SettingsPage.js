import { useEffect, useState } from "react";
import { getSettings, updateSettings, getCurrentUser, updateCurrentUser } from "../services/api";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_logo: "",
    company_tax: "",
    payment_terms: "",
    footer_text: "",
    invoice_prefix: "INV",
    invoice_padding: "5",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState({ name: "", email: "", password: "" });
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
      setMessage("Profile updated");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) return <div className="card glass">Loading...</div>;

  return (
    <div className="grid">
      <h1 className="page-title">Settings</h1>
      <div className="card glass grid">
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
      <form className="card glass grid" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-control">
            <label>Company name</label>
            <input value={settings.company_name || ""} onChange={(e) => handleChange("company_name", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Company email</label>
            <input value={settings.company_email || ""} onChange={(e) => handleChange("company_email", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Company phone</label>
            <input value={settings.company_phone || ""} onChange={(e) => handleChange("company_phone", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Company address</label>
            <input
              value={settings.company_address || ""}
              onChange={(e) => handleChange("company_address", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>Company tax ID</label>
            <input value={settings.company_tax || ""} onChange={(e) => handleChange("company_tax", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Logo (data URL)</label>
            <input value={settings.company_logo || ""} onChange={(e) => handleChange("company_logo", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Invoice prefix</label>
            <input value={settings.invoice_prefix || ""} onChange={(e) => handleChange("invoice_prefix", e.target.value)} />
          </div>
          <div className="form-control">
            <label>Invoice padding</label>
            <input
              type="number"
              min="1"
              value={settings.invoice_padding || 5}
              onChange={(e) => handleChange("invoice_padding", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>Payment terms</label>
            <textarea
              rows={3}
              value={settings.payment_terms || ""}
              onChange={(e) => handleChange("payment_terms", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>Footer text</label>
            <textarea
              rows={2}
              value={settings.footer_text || ""}
              onChange={(e) => handleChange("footer_text", e.target.value)}
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
