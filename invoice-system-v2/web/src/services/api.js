const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8787";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || res.statusText;
    throw new Error(message);
  }
  return data;
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const requestPasswordReset = async (email) => {
  const res = await fetch(`${API_URL}/api/auth/request-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
};

export const resetPassword = async (token, password) => {
  const res = await fetch(`${API_URL}/api/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return handleResponse(res);
};

export const getCurrentUser = async () => {
  const res = await fetch(`${API_URL}/api/users/me`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const updateCurrentUser = async (payload) => {
  const res = await fetch(`${API_URL}/api/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const generateInvoiceNumber = async () => {
  const res = await fetch(`${API_URL}/api/invoices/generate-number`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const getInvoices = async () => {
  const res = await fetch(`${API_URL}/api/invoices`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
};

export const getInvoice = async (id) => {
  const res = await fetch(`${API_URL}/api/invoices/${id}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
};

export const createInvoice = async (payload) => {
  const res = await fetch(`${API_URL}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateInvoice = async (id, payload) => {
  const res = await fetch(`${API_URL}/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteInvoice = async (id) => {
  const res = await fetch(`${API_URL}/api/invoices/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  return handleResponse(res);
};

export const uploadFile = async (_file) => {
  const res = await fetch(`${API_URL}/api/upload-url`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
};

export const getInvoicePdf = async (id) => {
  const res = await fetch(`${API_URL}/api/invoices/pdf/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to download PDF");
  return res.arrayBuffer();
};

export const getClients = async () => {
  const res = await fetch(`${API_URL}/api/clients`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const createClient = async (payload) => {
  const res = await fetch(`${API_URL}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const getClient = async (id) => {
  const res = await fetch(`${API_URL}/api/clients/${id}`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const updateClient = async (id, payload) => {
  const res = await fetch(`${API_URL}/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteClient = async (id) => {
  const res = await fetch(`${API_URL}/api/clients/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  return handleResponse(res);
};

export const getSettings = async () => {
  const res = await fetch(`${API_URL}/api/settings`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const updateSettings = async (payload) => {
  const res = await fetch(`${API_URL}/api/settings/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};
