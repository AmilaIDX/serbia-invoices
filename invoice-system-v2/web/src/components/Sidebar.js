import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Invoices", path: "/invoices" },
  { label: "Create Invoice", path: "/invoices/create" },
  { label: "Clients", path: "/clients" },
  { label: "Users", path: "/users" },
  { label: "Settings", path: "/settings" },
  { label: "Profile", path: "/profile" },
];

const Sidebar = ({ onLogout, theme, onToggleTheme, collapsed, user, mobile }) => {
  const { pathname } = useLocation();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobile ? "sidebar-mobile" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">SI</div>
        <div>
          <div className="sidebar__title">Serbia Invoices</div>
          <div className="sidebar__subtitle">{user?.email || "Control Panel"}</div>
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
          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        </button>
        <button className="btn full" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
