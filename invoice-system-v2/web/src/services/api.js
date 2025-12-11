const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error("REACT_APP_API_URL is required");
}

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
  const data = await handleResponse(res);
  if (data.token) localStorage.setItem("token", data.token);
  return data;
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

export const getInvoices = async () => {
  const res = await fetch(`${API_URL}/api/invoices`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const getInvoice = async (id) => {
  const res = await fetch(`${API_URL}/api/invoices/${id}`, { headers: { ...authHeaders() } });
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

export const generateInvoiceNumber = async () => {
  const res = await fetch(`${API_URL}/api/invoices/generate-number`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const getInvoicePdf = async (id) => {
  const res = await fetch(`${API_URL}/api/invoices/pdf/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to download PDF");
  return res.arrayBuffer();
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

// Placeholder upload; backend does not support file uploads in v2
export const uploadFile = async () => {
  // Placeholder since uploads are not implemented in v2
  return { uploadUrl: "" };
};

export const listUsers = async () => {
  const res = await fetch(`${API_URL}/api/users`, { headers: { ...authHeaders() } });
  return handleResponse(res);
};

export const getUsers = listUsers;

export const createUser = async (payload) => {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateUser = async (id, payload) => {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteUser = async (id) => {
  const res = await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE", headers: { ...authHeaders() } });
  if (res.status === 204) return true;
  return handleResponse(res);
};
