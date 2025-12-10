import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Create Invoice", path: "/create" },
  { label: "Clients", path: "/clients" },
  { label: "Settings", path: "/settings" },
  { label: "Profile", path: "/profile" },
  { label: "Reports", path: "/reports" },
  { label: "Export CSV", path: "/export" },
  { label: "Recurring Invoices", path: "/recurring" },
];

const Sidebar = ({ onLogout, theme, onToggleTheme, collapsed }) => {
  const { pathname } = useLocation();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">SI</div>
        <div>
          <div className="sidebar__title">Serbia Invoices</div>
          <div className="sidebar__subtitle">Control Panel</div>
        </div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className={`sidebar__link ${isActive(item.path) ? "active" : ""}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button className="btn secondary full" onClick={onToggleTheme}>
          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <button className="btn full" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
