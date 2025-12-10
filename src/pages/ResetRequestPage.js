import { useState } from "react";
import { requestPasswordReset } from "../services/api";
import { useNavigate } from "react-router-dom";

const ResetRequestPage = () => {
  const [email, setEmail] = useState("");
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
      const res = await requestPasswordReset(email);
      setMessage(`Reset link generated. Token (demo): ${res.reset_token}`);
    } catch (err) {
      setError(err.message || "Failed to request reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: 420 }}>
      <div className="card grid">
        <h1 className="page-title">Forgot password</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <div className="form-control">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {message && <div className="muted">{message}</div>}
          {error && <div className="danger">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <button className="btn secondary" onClick={() => navigate("/reset-password")}>
          I have a token
        </button>
      </div>
    </div>
  );
};

export default ResetRequestPage;
