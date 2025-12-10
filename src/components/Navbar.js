import { Link, useLocation } from "react-router-dom";

const Navbar = ({ onLogout, userEmail }) => {
  const location = useLocation();
  const active = (path) => (location.pathname.startsWith(path) ? "active" : "");

  return (
    <header
      style={{
        background: "#0b1220",
        borderBottom: "1px solid #1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>Serbia Invoices</div>
          <nav style={{ display: "flex", gap: "10px" }}>
            <Link className={`link ${active("/dashboard")}`} to="/dashboard">
              Dashboard
            </Link>
            <Link className={`link ${active("/create")}`} to="/create">
              New Invoice
            </Link>
            <Link className={`link ${active("/upload")}`} to="/upload">
              Upload
            </Link>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="muted">{userEmail || "user"}</span>
          <button className="btn secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
