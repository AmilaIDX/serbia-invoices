import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const LoginPage = ({ onAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(email, password);
      onAuth(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="glass card grid" style={{ maxWidth: 460, width: "100%" }}>
        <div>
          <p className="muted">Serbia Invoices</p>
          <h1 className="page-title">Welcome back</h1>
          <p className="muted">Sign in to access the dashboard, invoices, and clients.</p>
        </div>
        <form className="grid" onSubmit={handleSubmit}>
          <div className="form-control">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="form-control">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="danger">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="muted">Need access? Ask an admin to create your account.</p>
      </div>
    </div>
  );
};

export default LoginPage;
