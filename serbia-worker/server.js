const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8787;
const DB_FILE = process.env.DB_FILE || "/data/serbia.db";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET environment variable");
  process.exit(1);
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new sqlite3.Database(DB_FILE);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const initDb = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const raw = fs.readFileSync(schemaPath, "utf8");
    const stmts = raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of stmts) {
      await run(stmt);
    }
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const existing = await get("SELECT id FROM users WHERE email = ?", [process.env.ADMIN_EMAIL]);
    if (existing) {
      await run("UPDATE users SET password = ?, name = ? WHERE id = ?", [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_NAME || "Admin",
        existing.id,
      ]);
    } else {
      await run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [
        process.env.ADMIN_EMAIL,
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_NAME || "Admin",
      ]);
    }
  }
};

const computeStatus = (invoice) => {
  if (invoice.status === "paid") return "paid";
  if (invoice.due_date) {
    const now = new Date();
    const due = new Date(invoice.due_date);
    if (now > due) return "overdue";
  }
  return "pending";
};

const hydrateInvoice = (invoice) => {
  if (!invoice) return null;
  let items = [];
  try {
    items = invoice.line_items ? JSON.parse(invoice.line_items) : [];
  } catch {
    items = [];
  }
  let timeline = {};
  try {
    timeline = invoice.timeline ? JSON.parse(invoice.timeline) : {};
  } catch {
    timeline = {};
  }
  const total = invoice.total_amount ?? items.reduce((sum, i) => sum + Number(i.total || 0), 0);
  return { ...invoice, line_items: items, timeline, total_amount: total, status: computeStatus(invoice) };
};

const nextInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const latest = await get(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
    [`INV-${year}-%`]
  );
  if (!latest || !latest.invoice_number) return `INV-${year}-0001`;
  const parts = latest.invoice_number.split("-");
  const lastSeq = Number(parts[2] || 0);
  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `INV-${year}-${nextSeq}`;
};

const buildInvoicePdf = async (invoice) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const drawText = (text, x, y, size = 12, color = rgb(0, 0, 0), weight = "normal") => {
    page.drawText(String(text), { x, y, size, font: weight === "bold" ? bold : font, color });
  };
  const headerBg = rgb(0.95, 0.97, 1);
  const accent = rgb(0.23, 0.51, 0.94);
  const statusColor =
    invoice.status === "paid" ? rgb(0.13, 0.75, 0.33) : invoice.status === "overdue" ? rgb(0.9, 0.2, 0.2) : accent;

  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: headerBg });
  drawText("Serbia Invoice", 40, height - 50, 22, accent, "bold");
  drawText(`Invoice #: ${invoice.invoice_number || invoice.id}`, 40, height - 75, 12, rgb(0, 0, 0), "bold");
  drawText(`Issue: ${invoice.issue_date?.slice(0, 10) || invoice.created_at?.slice(0, 10) || "-"}`, 40, height - 95);
  drawText(`Due: ${invoice.due_date?.slice(0, 10) || "-"}`, 40, height - 110);
  page.drawRectangle({ x: width - 170, y: height - 90, width: 120, height: 28, color: statusColor, opacity: 0.12 });
  drawText(`Status: ${invoice.status}`, width - 165, height - 80, 12, statusColor, "bold");
  drawText("Bill To", 40, height - 150, 12, accent, "bold");
  drawText(invoice.client_name || "-", 40, height - 170, 12, rgb(0, 0, 0), "bold");
  drawText(invoice.client_address || "-", 40, height - 188);
  if (invoice.client_email) drawText(invoice.client_email, 40, height - 206);

  let y = height - 240;
  drawText("Line Items", 40, y, 12, accent, "bold");
  y -= 18;
  page.drawRectangle({ x: 35, y: y - 6, width: width - 70, height: 24, color: headerBg });
  drawText("Description", 40, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Qty", 300, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Unit (LKR)", 360, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Total (LKR)", 450, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  y -= 18;
  const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  items.forEach((item) => {
    page.drawLine({ start: { x: 35, y: y - 4 }, end: { x: width - 35, y: y - 4 }, color: headerBg, thickness: 1 });
    drawText(item.description || "-", 40, y);
    drawText(item.quantity ?? "-", 300, y);
    drawText(item.unit_price ?? "-", 360, y);
    drawText(item.total ?? "-", 450, y);
    y -= 16;
  });
  y -= 10;
  drawText(`Total Amount: LKR ${Number(invoice.total_amount || 0).toFixed(2)}`, 40, y, 14, accent, "bold");
  page.drawLine({ start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 }, thickness: 1, color: headerBg });
  drawText("Thanks for your business", 40, 40, 10, rgb(0.4, 0.4, 0.4));
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

// Middleware: CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Auth
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: "Identifier and password required" });
    const user =
      (await get("SELECT * FROM users WHERE email = ?", [identifier])) ||
      (await get("SELECT * FROM users WHERE phone = ?", [identifier])) ||
      (await get("SELECT * FROM users WHERE name = ?", [identifier]));
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 },
      JWT_SECRET
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/request-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });
  const token = crypto.randomUUID();
  const result = await run("UPDATE users SET reset_token = ? WHERE email = ?", [token, email]);
  if (result.changes === 0) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true, reset_token: token, message: "Reset link generated" });
});

app.post("/api/auth/reset", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  const user = await get("SELECT id FROM users WHERE reset_token = ?", [token]);
  if (!user) return res.status(400).json({ error: "Invalid token" });
  await run("UPDATE users SET password = ?, reset_token = NULL WHERE id = ?", [password, user.id]);
  res.json({ ok: true });
});

// Auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = auth.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

// Invoices
app.get("/api/invoices/generate-number", async (_req, res) => {
  try {
    const num = await nextInvoiceNumber();
    res.json({ invoice_number: num });
  } catch {
    res.status(500).json({ error: "Failed to generate number" });
  }
});

app.get("/api/invoices", async (_req, res) => {
  try {
    const rows = await all("SELECT * FROM invoices ORDER BY datetime(created_at) DESC");
    res.json(rows.map(hydrateInvoice));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/invoices", async (req, res) => {
  const payload = req.body || {};
  if (!payload.client_name) return res.status(400).json({ error: "client_name is required" });
  try {
    const number = payload.invoice_number || (await nextInvoiceNumber());
    const items = Array.isArray(payload.line_items) ? payload.line_items : [];
    const enriched = items.map((i) => ({ ...i, total: Number(i.quantity || 0) * Number(i.unit_price || 0) }));
    const total = enriched.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const finalStatus =
      payload.status === "paid" ? "paid" : computeStatus({ status: payload.status, due_date: payload.due_date });
    const result = await run(
      `INSERT INTO invoices (invoice_number, client_name, client_address, client_email, amount, status, issue_date, due_date, line_items, total_amount, timeline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        number,
        payload.client_name,
        payload.client_address || "",
        payload.client_email || "",
        total,
        finalStatus,
        payload.issue_date || new Date().toISOString(),
        payload.due_date || null,
        JSON.stringify(enriched),
        total,
        JSON.stringify(payload.timeline || {}),
      ]
    );
    const row = await get("SELECT * FROM invoices WHERE id = ?", [result.lastID]);
    res.status(201).json(hydrateInvoice(row));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  const row = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(hydrateInvoice(row));
});

app.put("/api/invoices/:id", async (req, res) => {
  const existing = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const payload = req.body || {};
  const items = Array.isArray(payload.line_items)
    ? payload.line_items
    : existing.line_items
    ? JSON.parse(existing.line_items)
    : [];
  const enriched = items.map((i) => ({ ...i, total: Number(i.quantity || 0) * Number(i.unit_price || 0) }));
  const total = enriched.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const draft = {
    ...existing,
    client_name: payload.client_name ?? existing.client_name,
    client_address: payload.client_address ?? existing.client_address,
    client_email: payload.client_email ?? existing.client_email,
    issue_date: payload.issue_date ?? existing.issue_date,
    due_date: payload.due_date ?? existing.due_date,
    status: payload.status ?? existing.status,
  };
  const finalStatus = payload.status === "paid" ? "paid" : computeStatus(draft);
  await run(
    `UPDATE invoices SET invoice_number = ?, client_name = ?, client_address = ?, client_email = ?, amount = ?, status = ?, issue_date = ?, due_date = ?, line_items = ?, total_amount = ?, timeline = ? WHERE id = ?`,
    [
      payload.invoice_number ?? existing.invoice_number,
      draft.client_name,
      draft.client_address,
      draft.client_email,
      total,
      finalStatus,
      draft.issue_date,
      draft.due_date,
      JSON.stringify(enriched),
      total,
      JSON.stringify(payload.timeline ?? (existing.timeline ? JSON.parse(existing.timeline) : {})),
      req.params.id,
    ]
  );
  const row = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
  res.json(hydrateInvoice(row));
});

app.delete("/api/invoices/:id", async (req, res) => {
  await run("DELETE FROM invoices WHERE id = ?", [req.params.id]);
  res.sendStatus(204);
});

app.get("/api/invoices/pdf/:id", async (req, res) => {
  const row = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const pdfBytes = await buildInvoicePdf(hydrateInvoice(row));
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", `inline; filename="invoice-${row.invoice_number || row.id}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

// Clients
app.get("/api/clients", async (_req, res) => {
  const rows = await all("SELECT * FROM clients ORDER BY name ASC");
  res.json(rows || []);
});

app.post("/api/clients", async (req, res) => {
  const { name, address = "", applying_from = "", email = "", phone = "" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = await run(
    "INSERT INTO clients (name, address, applying_from, email, phone) VALUES (?, ?, ?, ?, ?)",
    [name, address, applying_from, email, phone]
  );
  const row = await get("SELECT * FROM clients WHERE id = ?", [result.lastID]);
  res.status(201).json(row);
});

app.get("/api/clients/:id", async (req, res) => {
  const row = await get("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.put("/api/clients/:id", async (req, res) => {
  const existing = await get("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const payload = req.body || {};
  await run("UPDATE clients SET name = ?, address = ?, applying_from = ?, email = ?, phone = ? WHERE id = ?", [
    payload.name ?? existing.name,
    payload.address ?? existing.address,
    payload.applying_from ?? existing.applying_from,
    payload.email ?? existing.email,
    payload.phone ?? existing.phone,
    req.params.id,
  ]);
  const row = await get("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  res.json(row);
});

app.delete("/api/clients/:id", async (req, res) => {
  await run("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.sendStatus(204);
});

// Settings
app.get("/api/settings", async (_req, res) => {
  const rows = await all("SELECT key, value FROM settings");
  const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(map);
});

app.post("/api/settings/update", async (req, res) => {
  const payload = req.body || {};
  await run("BEGIN");
  const stmt = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  Object.entries(payload).forEach(([k, v]) => stmt.run(k, String(v)));
  stmt.finalize();
  await run("COMMIT");
  const rows = await all("SELECT key, value FROM settings");
  const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(map);
});

// User profile
app.get("/api/users/me", async (req, res) => {
  const user = await get("SELECT * FROM users WHERE id = ?", [req.auth.sub]);
  res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone });
});

app.put("/api/users/me", async (req, res) => {
  const user = await get("SELECT * FROM users WHERE id = ?", [req.auth.sub]);
  const payload = req.body || {};
  await run("UPDATE users SET email = ?, name = ?, phone = ?, password = COALESCE(?, password) WHERE id = ?", [
    payload.email || user.email,
    payload.name || user.name,
    payload.phone || user.phone,
    payload.password || null,
    req.auth.sub,
  ]);
  const updated = await get("SELECT * FROM users WHERE id = ?", [req.auth.sub]);
  res.json({ id: updated.id, email: updated.email, name: updated.name, phone: updated.phone });
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`API running on port ${PORT}, DB at ${DB_FILE}`);
});
