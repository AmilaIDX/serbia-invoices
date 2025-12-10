import { json, error, withCors } from "./utils/response";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const textBody = async (request) => {
  try {
    return await request.text();
  } catch {
    return "";
  }
};

const readJson = async (request) => {
  const bodyText = await textBody(request);
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error("Invalid JSON");
  }
};

const toBuffer = (str) => new TextEncoder().encode(str);

const base64url = (arrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64url = (input) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const decoded = atob(normalized + pad);
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
};

const signToken = async (payload, secret) => {
  const header = base64url(toBuffer(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(toBuffer(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    toBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, toBuffer(`${header}.${body}`));
  return `${header}.${body}.${base64url(signature)}`;
};

const verifyToken = async (token, secret) => {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    toBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64url(signature),
    toBuffer(`${header}.${body}`)
  );
  if (!isValid) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
};

const getAuthUser = async (request, secret) => {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  return verifyToken(token, secret);
};

const serializeUser = (u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone });

const ensureSeedUser = async (env) => {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_NAME || "Admin";
  if (!email || !password) return null;
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) {
    await env.DB.prepare("UPDATE users SET password = ?, name = ? WHERE email = ?").bind(password, name, email).run();
    return { email };
  }
  await env.DB.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").bind(email, password, name).run();
  return { email };
};

const nextInvoiceNumber = async (env) => {
  const year = new Date().getFullYear();
  const latest = await env.DB.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1"
  )
    .bind(`INV-${year}-%`)
    .first();
  if (!latest || !latest.invoice_number) return `INV-${year}-0001`;
  const parts = latest.invoice_number.split("-");
  const lastSeq = Number(parts[2] || 0);
  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `INV-${year}-${nextSeq}`;
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
  const parsedItems = (() => {
    try {
      return invoice.line_items ? JSON.parse(invoice.line_items) : [];
    } catch {
      return [];
    }
  })();
  const parsedTimeline = (() => {
    try {
      return invoice.timeline ? JSON.parse(invoice.timeline) : {};
    } catch {
      return {};
    }
  })();
  const total = invoice.total_amount ?? parsedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return {
    ...invoice,
    line_items: parsedItems,
    timeline: parsedTimeline,
    total_amount: total,
    status: computeStatus(invoice),
  };
};

const listInvoices = async (env) => {
  const rows = await env.DB.prepare("SELECT * FROM invoices ORDER BY datetime(created_at) DESC").all();
  return (rows.results || []).map(hydrateInvoice);
};

const getInvoice = async (env, id) => {
  const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
  return hydrateInvoice(invoice);
};

const createInvoice = async (env, payload) => {
  const {
    client_name,
    client_address = "",
    client_email = "",
    issue_date = new Date().toISOString(),
    due_date,
    status = "pending",
    line_items = [],
    timeline = {},
  } = payload;
  if (!client_name) throw new Error("client_name is required");
  const number = payload.invoice_number || (await nextInvoiceNumber(env));
  const parsedItems = Array.isArray(line_items) ? line_items : [];
  const enrichedItems = parsedItems.map((item) => ({
    ...item,
    total: Number(item.quantity || 0) * Number(item.unit_price || 0),
  }));
  const total = enrichedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const finalStatus = status === "paid" ? "paid" : computeStatus({ status, due_date });
  await env.DB.prepare(
    `INSERT INTO invoices (invoice_number, client_name, client_address, client_email, amount, status, issue_date, due_date, line_items, total_amount, timeline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      number,
      client_name,
      client_address,
      client_email,
      total,
      finalStatus,
      issue_date,
      due_date || null,
      JSON.stringify(enrichedItems),
      total,
      JSON.stringify(timeline || {})
    )
    .run();
  const { id } = await env.DB.prepare("SELECT last_insert_rowid() as id").first();
  return getInvoice(env, id);
};

const updateInvoice = async (env, id, payload) => {
  const existing = await env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
  if (!existing) return null;
  const parsedItems = Array.isArray(payload.line_items)
    ? payload.line_items
    : existing.line_items
    ? JSON.parse(existing.line_items)
    : [];
  const enrichedItems = parsedItems.map((item) => ({
    ...item,
    total: Number(item.quantity || 0) * Number(item.unit_price || 0),
  }));
  const total = enrichedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const nextTimeline =
    payload.timeline !== undefined
      ? payload.timeline
      : existing.timeline
      ? JSON.parse(existing.timeline)
      : {};
  const draftInvoice = {
    ...existing,
    client_name: payload.client_name ?? existing.client_name,
    client_address: payload.client_address ?? existing.client_address,
    client_email: payload.client_email ?? existing.client_email,
    issue_date: payload.issue_date ?? existing.issue_date,
    due_date: payload.due_date ?? existing.due_date,
    status: payload.status ?? existing.status,
  };
  const finalStatus = payload.status === "paid" ? "paid" : computeStatus(draftInvoice);
  await env.DB.prepare(
    `UPDATE invoices
     SET invoice_number = ?, client_name = ?, client_address = ?, client_email = ?, amount = ?, status = ?, issue_date = ?, due_date = ?, line_items = ?, total_amount = ?, timeline = ?
     WHERE id = ?`
  )
    .bind(
      payload.invoice_number ?? existing.invoice_number,
      draftInvoice.client_name,
      draftInvoice.client_address,
      draftInvoice.client_email,
      total,
      finalStatus,
      draftInvoice.issue_date,
      draftInvoice.due_date,
      JSON.stringify(enrichedItems),
      total,
      JSON.stringify(nextTimeline || {}),
      id
    )
    .run();
  return getInvoice(env, id);
};

const deleteInvoice = async (env, id) => {
  await env.DB.prepare("DELETE FROM invoices WHERE id = ?").bind(id).run();
};

const listClients = async (env) => {
  const rows = await env.DB.prepare("SELECT * FROM clients ORDER BY name ASC").all();
  return rows.results || [];
};

const createClient = async (env, payload) => {
  const { name, address = "", applying_from = "", email = "", phone = "" } = payload;
  if (!name) throw new Error("name is required");
  await env.DB.prepare("INSERT INTO clients (name, address, applying_from, email, phone) VALUES (?, ?, ?, ?, ?)")
    .bind(name, address, applying_from, email, phone)
    .run();
  const { id } = await env.DB.prepare("SELECT last_insert_rowid() as id").first();
  return env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
};

const updateClient = async (env, id, payload) => {
  const existing = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
  if (!existing) return null;
  await env.DB.prepare("UPDATE clients SET name = ?, address = ?, applying_from = ?, email = ?, phone = ? WHERE id = ?")
    .bind(
      payload.name ?? existing.name,
      payload.address ?? existing.address,
      payload.applying_from ?? existing.applying_from,
      payload.email ?? existing.email,
      payload.phone ?? existing.phone,
      id
    )
    .run();
  return env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
};

const getSettings = async (env) => {
  const rows = await env.DB.prepare("SELECT key, value FROM settings").all();
  return (rows.results || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

const updateSettings = async (env, payload) => {
  for (const [key, value] of Object.entries(payload || {})) {
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
      .bind(key, String(value))
      .run();
  }
  return getSettings(env);
};

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

  // Header bar
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: headerBg });
  drawText("Serbia Invoice", 40, height - 50, 22, accent, "bold");
  drawText(`Invoice #: ${invoice.invoice_number || invoice.id}`, 40, height - 75, 12, rgb(0, 0, 0), "bold");
  drawText(`Issue: ${invoice.issue_date?.slice(0, 10) || invoice.created_at?.slice(0, 10) || "-"}`, 40, height - 95);
  drawText(`Due: ${invoice.due_date?.slice(0, 10) || "-"}`, 40, height - 110);

  // Status pill
  page.drawRectangle({ x: width - 170, y: height - 90, width: 120, height: 28, color: statusColor, opacity: 0.12 });
  drawText(`Status: ${invoice.status}`, width - 165, height - 80, 12, statusColor, "bold");

  // Bill to
  drawText("Bill To", 40, height - 150, 12, accent, "bold");
  drawText(invoice.client_name || "-", 40, height - 170, 12, rgb(0, 0, 0), "bold");
  drawText(invoice.client_address || "-", 40, height - 188);
  if (invoice.client_email) drawText(invoice.client_email, 40, height - 206);

  let y = height - 240;
  drawText("Line Items", 40, y, 12, accent, "bold");
  y -= 18;
  // table header
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

  // Footer
  page.drawLine({ start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 }, thickness: 1, color: headerBg });
  drawText("Thanks for your business", 40, 40, 10, rgb(0.4, 0.4, 0.4));
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

const handleUploadUrl = (request) => {
  const url = new URL(request.url);
  const fakeKey = crypto.randomUUID();
  return json({
    uploadUrl: `${url.origin}/upload/${fakeKey}`,
    key: fakeKey,
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const secret = env.JWT_SECRET;
    if (!secret) return error("Server misconfigured: missing JWT secret", 500);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    try {
      if (url.pathname === "/") {
        return json({ ok: true, message: "serbia-worker ready" });
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        await ensureSeedUser(env);
        const body = await readJson(request);
        const { identifier, password } = body;
        if (!identifier || !password) return error("Identifier and password required", 400);
        const user =
          (await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(identifier).first()) ||
          (await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(identifier).first()) ||
          (await env.DB.prepare("SELECT * FROM users WHERE name = ?").bind(identifier).first());
        if (!user || user.password !== password) return error("Invalid credentials", 401);
        const token = await signToken(
          { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 },
          secret
        );
        return json({ token, user: serializeUser(user) });
      }

      if (url.pathname === "/api/auth/request-reset" && request.method === "POST") {
        const body = await readJson(request);
        const { email } = body;
        if (!email) return error("Email required", 400);
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return error("User not found", 404);
        const token = crypto.randomUUID();
        await env.DB.prepare("UPDATE users SET reset_token = ? WHERE id = ?").bind(token, user.id).run();
        // In a real system send email; here we return token for demo.
        return json({ ok: true, reset_token: token, message: "Reset link generated" });
      }

      if (url.pathname === "/api/auth/reset" && request.method === "POST") {
        const body = await readJson(request);
        const { token, password } = body;
        if (!token || !password) return error("Token and password required", 400);
        const user = await env.DB.prepare("SELECT * FROM users WHERE reset_token = ?").bind(token).first();
        if (!user) return error("Invalid token", 400);
        await env.DB.prepare("UPDATE users SET password = ?, reset_token = NULL WHERE id = ?")
          .bind(password, user.id)
          .run();
        return json({ ok: true });
      }

      const user = await getAuthUser(request, secret);
      if (!user) return error("Unauthorized", 401);

      const currentUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.sub).first();

      if (url.pathname === "/api/invoices/generate-number" && request.method === "GET") {
        const num = await nextInvoiceNumber(env);
        return json({ invoice_number: num });
      }

      if (url.pathname === "/api/invoices" && request.method === "GET") {
        const items = await listInvoices(env);
        return json(items);
      }

      if (url.pathname === "/api/invoices" && request.method === "POST") {
        const body = await readJson(request);
        const invoice = await createInvoice(env, body);
        return json(invoice, { status: 201 });
      }

      const invoiceIdMatch = url.pathname.match(/^\/api\/invoices\/(\d+)$/);
      if (invoiceIdMatch) {
        const id = Number(invoiceIdMatch[1]);
        if (request.method === "GET") {
          const invoice = await getInvoice(env, id);
          if (!invoice) return error("Not found", 404);
          return json(invoice);
        }
        if (request.method === "PUT") {
          const body = await readJson(request);
          const updated = await updateInvoice(env, id, body);
          if (!updated) return error("Not found", 404);
          return json(updated);
        }
        if (request.method === "DELETE") {
          await deleteInvoice(env, id);
          return withCors(new Response(null, { status: 204 }));
        }
      }

      const invoicePdfMatch = url.pathname.match(/^\/api\/invoices\/pdf\/(\d+)$/);
      if (invoicePdfMatch && request.method === "GET") {
        const id = Number(invoicePdfMatch[1]);
        const invoice = await getInvoice(env, id);
        if (!invoice) return error("Not found", 404);
        const pdfBytes = await buildInvoicePdf(invoice);
        return new Response(pdfBytes, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="invoice-${invoice.invoice_number || id}.pdf"`,
            "access-control-allow-origin": "*",
          },
        });
      }

      if (url.pathname === "/api/clients" && request.method === "GET") {
        const clients = await listClients(env);
        return json(clients);
      }
      if (url.pathname === "/api/clients" && request.method === "POST") {
        const body = await readJson(request);
        const client = await createClient(env, body);
        return json(client, { status: 201 });
      }
      const clientIdMatch = url.pathname.match(/^\/api\/clients\/(\d+)$/);
      if (clientIdMatch) {
        const id = Number(clientIdMatch[1]);
        if (request.method === "GET") {
          const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
          if (!client) return error("Not found", 404);
          return json(client);
        }
        if (request.method === "PUT") {
          const body = await readJson(request);
          const updated = await updateClient(env, id, body);
          if (!updated) return error("Not found", 404);
          return json(updated);
        }
        if (request.method === "DELETE") {
          await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
          return withCors(new Response(null, { status: 204 }));
        }
      }

      if (url.pathname === "/api/settings" && request.method === "GET") {
        const settings = await getSettings(env);
        return json(settings);
      }
      if (url.pathname === "/api/settings/update" && request.method === "POST") {
        const body = await readJson(request);
        const updated = await updateSettings(env, body);
        return json(updated);
      }

      if (url.pathname === "/api/users/me" && request.method === "GET") {
        return json(serializeUser(currentUser));
      }
      if (url.pathname === "/api/users/me" && request.method === "PUT") {
        const body = await readJson(request);
        await env.DB.prepare("UPDATE users SET email = ?, name = ?, phone = ?, password = COALESCE(?, password) WHERE id = ?")
          .bind(body.email || currentUser.email, body.name || currentUser.name, body.phone || currentUser.phone, body.password || null, currentUser.id)
          .run();
        const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();
        return json(serializeUser(updated));
      }

      if (url.pathname === "/api/upload-url" && request.method === "POST") {
        return handleUploadUrl(request);
      }

      return error("Not Found", 404);
    } catch (err) {
      return error(err.message || "Server error", 500);
    }
  },
};
