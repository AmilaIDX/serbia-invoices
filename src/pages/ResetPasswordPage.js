import { useState } from "react";
import { resetPassword } from "../services/api";
import { useNavigate } from "react-router-dom";

const ResetPasswordPage = () => {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await resetPassword(token, password);
      setMessage("Password reset. You can login now.");
    } catch (err) {
      setError(err.message || "Failed to reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: 420 }}>
      <div className="card grid">
        <h1 className="page-title">Reset password</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <div className="form-control">
            <label>Reset token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="form-control">
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {message && <div className="muted">{message}</div>}
          {error && <div className="danger">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <button className="btn secondary" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
