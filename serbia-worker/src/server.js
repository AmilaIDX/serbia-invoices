import fs from "fs";
import path from "path";
import express from "express";
import sqlite3 from "sqlite3";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const app = express();
const PORT = process.env.PORT || 8787;
const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), "data", "serbia.db");
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable");
  process.exit(1);
}

// ensure db directory
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new sqlite3.Database(DB_FILE);

const loadSchema = () => {
  const schemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  db.serialize(() => {
    sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((stmt) => db.run(stmt));
  });
};
loadSchema();

// Helpers
const toBuffer = (str) => Buffer.from(str, "utf8");
const base64url = (input) => Buffer.from(input).toString("base64url");
const fromBase64url = (input) => Buffer.from(input, "base64url");

const signToken = async (payload, secret) => {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const crypto = await import("crypto");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
};

const verifyToken = async (token, secret) => {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (expected !== signature) return null;
  const payload = JSON.parse(fromBase64url(body).toString("utf8"));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
};

const getAuthUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  return verifyToken(token, JWT_SECRET);
};

const serializeUser = (u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone });

const ensureSeedUser = () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";
  if (!email || !password) return;
  db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return;
    if (row) {
      db.run("UPDATE users SET password = ?, name = ? WHERE email = ?", [password, name, email]);
    } else {
      db.run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [email, password, name]);
    }
  });
};
ensureSeedUser();

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
  let parsedItems = [];
  try {
    parsedItems = invoice.line_items ? JSON.parse(invoice.line_items) : [];
  } catch {
    parsedItems = [];
  }
  let timeline = {};
  try {
    timeline = invoice.timeline ? JSON.parse(invoice.timeline) : {};
  } catch {
    timeline = {};
  }
  const total =
    invoice.total_amount ??
    parsedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return { ...invoice, line_items: parsedItems, timeline, total_amount: total, status: computeStatus(invoice) };
};

const nextInvoiceNumber = () =>
  new Promise((resolve, reject) => {
    const year = new Date().getFullYear();
    db.get(
      "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
      [`INV-${year}-%`],
      (err, row) => {
        if (err) return reject(err);
        if (!row || !row.invoice_number) return resolve(`INV-${year}-0001`);
        const parts = row.invoice_number.split("-");
        const lastSeq = Number(parts[2] || 0);
        const nextSeq = String(lastSeq + 1).padStart(4, "0");
        resolve(`INV-${year}-${nextSeq}`);
      }
    );
  });

const buildInvoicePdf = async (invoice) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
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

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Routes
app.get("/", (_req, res) => res.json({ ok: true, message: "serbia-api ready" }));

app.post("/api/auth/login", async (req, res) => {
  ensureSeedUser();
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: "Identifier and password required" });
  db.get(
    "SELECT * FROM users WHERE email = ? OR phone = ? OR name = ?",
    [identifier, identifier, identifier],
    async (err, user) => {
      if (err) return res.status(500).json({ error: "Server error" });
      if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
      const token = await signToken(
        { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 },
        JWT_SECRET
      );
      res.json({ token, user: serializeUser(user) });
    }
  );
});

app.post("/api/auth/request-reset", (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });
  const token = crypto.randomUUID();
  db.run("UPDATE users SET reset_token = ? WHERE email = ?", [token, email], function (err) {
    if (err) return res.status(500).json({ error: "Server error" });
    if (this.changes === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ ok: true, reset_token: token, message: "Reset link generated" });
  });
});

app.post("/api/auth/reset", (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  db.get("SELECT id FROM users WHERE reset_token = ?", [token], (err, user) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!user) return res.status(400).json({ error: "Invalid token" });
    db.run("UPDATE users SET password = ?, reset_token = NULL WHERE id = ?", [password, user.id], (e) => {
      if (e) return res.status(500).json({ error: "Server error" });
      return res.json({ ok: true });
    });
  });
});

// Auth middleware
app.use(async (req, res, next) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.auth = user;
  next();
});

app.get("/api/invoices/generate-number", async (_req, res) => {
  try {
    const num = await nextInvoiceNumber();
    res.json({ invoice_number: num });
  } catch {
    res.status(500).json({ error: "Failed to generate number" });
  }
});

app.get("/api/invoices", (_req, res) => {
  db.all("SELECT * FROM invoices ORDER BY datetime(created_at) DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(rows.map(hydrateInvoice));
  });
});

app.post("/api/invoices", async (req, res) => {
  const payload = req.body || {};
  if (!payload.client_name) return res.status(400).json({ error: "client_name is required" });
  const number = payload.invoice_number || (await nextInvoiceNumber());
  const items = Array.isArray(payload.line_items) ? payload.line_items : [];
  const enriched = items.map((i) => ({ ...i, total: Number(i.quantity || 0) * Number(i.unit_price || 0) }));
  const total = enriched.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const finalStatus = payload.status === "paid" ? "paid" : computeStatus({ status: payload.status, due_date: payload.due_date });
  db.run(
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
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Server error" });
      db.get("SELECT * FROM invoices WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: "Server error" });
        res.status(201).json(hydrateInvoice(row));
      });
    }
  );
});

app.get("/api/invoices/:id", (req, res) => {
  db.get("SELECT * FROM invoices WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(hydrateInvoice(row));
  });
});

app.put("/api/invoices/:id", (req, res) => {
  db.get("SELECT * FROM invoices WHERE id = ?", [req.params.id], (err, existing) => {
    if (err) return res.status(500).json({ error: "Server error" });
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
    db.run(
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
      ],
      (e) => {
        if (e) return res.status(500).json({ error: "Server error" });
        db.get("SELECT * FROM invoices WHERE id = ?", [req.params.id], (err2, row) => {
          if (err2) return res.status(500).json({ error: "Server error" });
          res.json(hydrateInvoice(row));
        });
      }
    );
  });
});

app.delete("/api/invoices/:id", (req, res) => {
  db.run("DELETE FROM invoices WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.sendStatus(204);
  });
});

app.get("/api/invoices/pdf/:id", (req, res) => {
  db.get("SELECT * FROM invoices WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!row) return res.status(404).json({ error: "Not found" });
    const pdfBytes = await buildInvoicePdf(hydrateInvoice(row));
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename=\"invoice-${row.invoice_number || row.id}.pdf\"`);
    res.send(Buffer.from(pdfBytes));
  });
});

// Clients
app.get("/api/clients", (_req, res) => {
  db.all("SELECT * FROM clients ORDER BY name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(rows || []);
  });
});

app.post("/api/clients", (req, res) => {
  const { name, address = "", applying_from = "", email = "", phone = "" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  db.run(
    "INSERT INTO clients (name, address, applying_from, email, phone) VALUES (?, ?, ?, ?, ?)",
    [name, address, applying_from, email, phone],
    function (err) {
      if (err) return res.status(500).json({ error: "Server error" });
      db.get("SELECT * FROM clients WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: "Server error" });
        res.status(201).json(row);
      });
    }
  );
});

app.get("/api/clients/:id", (req, res) => {
  db.get("SELECT * FROM clients WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.put("/api/clients/:id", (req, res) => {
  db.get("SELECT * FROM clients WHERE id = ?", [req.params.id], (err, existing) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const payload = req.body || {};
    db.run(
      "UPDATE clients SET name = ?, address = ?, applying_from = ?, email = ?, phone = ? WHERE id = ?",
      [
        payload.name ?? existing.name,
        payload.address ?? existing.address,
        payload.applying_from ?? existing.applying_from,
        payload.email ?? existing.email,
        payload.phone ?? existing.phone,
        req.params.id,
      ],
      (e) => {
        if (e) return res.status(500).json({ error: "Server error" });
        db.get("SELECT * FROM clients WHERE id = ?", [req.params.id], (err2, row) => {
          if (err2) return res.status(500).json({ error: "Server error" });
          res.json(row);
        });
      }
    );
  });
});

app.delete("/api/clients/:id", (req, res) => {
  db.run("DELETE FROM clients WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.sendStatus(204);
  });
});

// Settings
app.get("/api/settings", (_req, res) => {
  db.all("SELECT key, value FROM settings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Server error" });
    const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(map);
  });
});

app.post("/api/settings/update", (req, res) => {
  const payload = req.body || {};
  db.serialize(() => {
    const stmt = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    Object.entries(payload).forEach(([k, v]) => stmt.run(k, String(v)));
    stmt.finalize();
    db.all("SELECT key, value FROM settings", [], (err, rows) => {
      if (err) return res.status(500).json({ error: "Server error" });
      const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
      res.json(map);
    });
  });
});

// User profile
app.get("/api/users/me", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.auth.sub], (err, user) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json(serializeUser(user));
  });
});

app.put("/api/users/me", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.auth.sub], (err, user) => {
    if (err) return res.status(500).json({ error: "Server error" });
    const payload = req.body || {};
    db.run(
      "UPDATE users SET email = ?, name = ?, phone = ?, password = COALESCE(?, password) WHERE id = ?",
      [
        payload.email || user.email,
        payload.name || user.name,
        payload.phone || user.phone,
        payload.password || null,
        req.auth.sub,
      ],
      (e) => {
        if (e) return res.status(500).json({ error: "Server error" });
        db.get("SELECT * FROM users WHERE id = ?", [req.auth.sub], (err2, updated) => {
          if (err2) return res.status(500).json({ error: "Server error" });
          res.json(serializeUser(updated));
        });
      }
    );
  });
});

// Upload URL placeholder
app.post("/api/upload-url", (req, res) => {
  const url = `${req.protocol}://${req.get("host")}/upload/${crypto.randomUUID()}`;
  res.json({ uploadUrl: url, key: url.split("/").pop() });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}, DB at ${DB_FILE}`);
});
