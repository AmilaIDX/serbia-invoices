import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const LoginPage = ({ onAuth }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(identifier, password);
      onAuth(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: 420 }}>
      <div className="card grid">
        <h1 className="page-title">Login</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <div className="form-control">
            <label>Email / Username / Phone</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
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
        <button className="btn secondary" type="button" onClick={() => navigate("/reset-request")}>
          Forgot password?
        </button>
        <p className="muted">Need access? Ask an admin to create your account.</p>
      </div>
    </div>
  );
};

export default LoginPage;
