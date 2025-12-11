import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import ClientsPage from "./pages/ClientsPage";
import CreateClientPage from "./pages/CreateClientPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import InvoicesPage from "./pages/InvoicesPage";
import Sidebar from "./components/Sidebar";
import { getCurrentUser } from "./services/api";
import "./styles/theme.css";
import "./App.css";

const ProtectedRoute = ({ isAuthed, children }) => {
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 960 : false));

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!token) return;
    const loadMe = async () => {
      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch {
        handleLogout();
      }
    };
    loadMe();
  }, [token]);

  const handleLogout = () => {
    setToken("");
    setUser(null);
  };

  const isAuthed = Boolean(token);

  return (
    <BrowserRouter>
      <div className={`app ${isAuthed ? "" : "no-sidebar"}`}>
        {isAuthed && (
          <>
            {isMobile && sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
            <Sidebar
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
              collapsed={isMobile && !sidebarOpen}
              user={user}
              mobile={isMobile}
            />
          </>
        )}
        <div className="main">
          <div className="content">
            {isAuthed && (
              <div className="mobile-toggle">
                <button className="btn secondary" onClick={() => setSidebarOpen((v) => !v)}>
                  {sidebarOpen ? "Close" : "☰ Menu"}
                </button>
              </div>
            )}
            <Routes>
              <Route
                path="/"
                element={isAuthed ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
              />
              <Route path="/login" element={<LoginPage onAuth={(t, u) => { setToken(t); setUser(u); }} />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/create"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <CreateInvoicePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/:id"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <InvoiceDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <ClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/create"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <CreateClientPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <ClientDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute isAuthed={isAuthed}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
