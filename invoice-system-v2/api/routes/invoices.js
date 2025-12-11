const express = require("express");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { all, get, run, getSettingsMap } = require("../db");

const router = express.Router();

const computeTotals = (items = [], settings = {}) => {
  const defaultVatRate = Number(settings.default_vat_rate || 0);
  const normalized = items.map((item) => ({
    description: item.description || "",
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price ?? item.price ?? 0),
    vat_rate: item.vat_rate !== undefined ? Number(item.vat_rate) : defaultVatRate,
  }));
  const subtotal = normalized.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const vatAmount = normalized.reduce((sum, item) => sum + item.quantity * item.unit_price * (item.vat_rate / 100), 0);
  const total = subtotal + vatAmount;
  return {
    items: normalized.map((item) => ({ ...item, total: item.quantity * item.unit_price })),
    subtotal,
    vat: vatAmount,
    total,
  };
};

const withStatus = (invoice) => {
  const due = invoice.due_date ? new Date(invoice.due_date) : null;
  const status = invoice.status || (due && new Date() > due ? "overdue" : "pending");
  return { ...invoice, status };
};

const getPrefixPadding = async () => {
  const settings = await getSettingsMap();
  const prefix = settings.invoice_prefix || "INV";
  const padding = Number(settings.invoice_padding || 5);
  const start = Number(settings.invoice_start || 1);
  return { prefix, padding, start };
};

const nextNumber = async () => {
  await run("BEGIN IMMEDIATE");
  const { prefix, padding, start } = await getPrefixPadding();
  await run("INSERT INTO invoice_counter (id, value) VALUES (1, ?) ON CONFLICT(id) DO NOTHING", [start - 1]);
  const row = await get("SELECT value FROM invoice_counter WHERE id = 1");
  const current = row?.value ?? start - 1;
  const next = current + 1;
  await run("UPDATE invoice_counter SET value = ? WHERE id = 1", [next]);
  await run("COMMIT");
  return `${prefix}-${String(next).padStart(padding, "0")}`;
};

const embedLogo = async (pdfDoc, logoValue) => {
  if (!logoValue) return null;
  try {
    if (logoValue.startsWith("data:image/png")) {
      const pngImage = await pdfDoc.embedPng(Buffer.from(logoValue.split(",")[1], "base64"));
      return pngImage;
    }
    if (logoValue.startsWith("data:image/jpeg") || logoValue.startsWith("data:image/jpg")) {
      const jpgImage = await pdfDoc.embedJpg(Buffer.from(logoValue.split(",")[1], "base64"));
      return jpgImage;
    }
  } catch {
    return null;
  }
  return null;
};

const buildPdf = async (invoice, settings = {}) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const accent = rgb(0.24, 0.59, 0.98);
  const soft = rgb(0.11, 0.14, 0.2);

  const drawText = (text, x, y, size = 11, color = rgb(0.95, 0.95, 0.96), weight = "normal") => {
    page.drawText(String(text || ""), { x, y, size, font: weight === "bold" ? bold : font, color });
  };

  // Background panels
  page.drawRectangle({ x: 0, y: 0, width, height, color: soft });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, color: rgb(0.07, 0.09, 0.13) });

  // Logo and company block
  const logo = await embedLogo(pdfDoc, settings.company_logo);
  if (logo) {
    const logoDims = logo.scale(0.2);
    page.drawImage(logo, { x: 40, y: height - 140, width: logoDims.width, height: logoDims.height });
  } else {
    page.drawRectangle({
      x: 40,
      y: height - 120,
      width: 80,
      height: 40,
      color: accent,
      opacity: 0.35,
    });
    drawText("INVOICE", 46, height - 98, 14, rgb(1, 1, 1), "bold");
  }

  const companyY = height - 70;
  drawText(settings.company_name || "Company", 140, companyY, 16, rgb(1, 1, 1), "bold");
  if (settings.company_email) drawText(settings.company_email, 140, companyY - 18);
  if (settings.company_phone) drawText(settings.company_phone, 140, companyY - 34);
  if (settings.company_address) drawText(settings.company_address, 140, companyY - 50);
  if (settings.company_tax) drawText(`Tax: ${settings.company_tax}`, 140, companyY - 66);

  // Invoice meta
  drawText("Invoice", width - 180, companyY, 16, accent, "bold");
  drawText(`No: ${invoice.invoice_number || invoice.id}`, width - 180, companyY - 18);
  drawText(`Date: ${invoice.date ? invoice.date.slice(0, 10) : ""}`, width - 180, companyY - 34);
  drawText(`Due: ${invoice.due_date ? invoice.due_date.slice(0, 10) : ""}`, width - 180, companyY - 50);

  // Client block
  let y = height - 170;
  drawText("Bill To", 40, y, 12, accent, "bold");
  drawText(invoice.client_name || "-", 40, y - 16, 12, rgb(1, 1, 1), "bold");
  if (invoice.client_email) drawText(invoice.client_email, 40, y - 32);
  if (invoice.client_phone) drawText(invoice.client_phone, 40, y - 48);
  if (invoice.client_address) drawText(invoice.client_address, 40, y - 64);

  // Summary block
  page.drawRectangle({ x: width - 220, y: y - 70, width: 180, height: 90, color: rgb(0.12, 0.15, 0.21) });
  drawText("Summary", width - 210, y - 50, 12, accent, "bold");
  drawText(`Subtotal: ${Number(invoice.subtotal || 0).toFixed(2)}`, width - 210, y - 66);
  drawText(`VAT: ${Number(invoice.vat || 0).toFixed(2)}`, width - 210, y - 82);
  drawText(`Total: ${Number(invoice.total || 0).toFixed(2)}`, width - 210, y - 98, 12, rgb(1, 1, 1), "bold");

  // Items table
  y -= 110;
  drawText("Items", 40, y, 12, accent, "bold");
  y -= 16;
  page.drawRectangle({ x: 40, y: y - 6, width: width - 80, height: 22, color: rgb(0.14, 0.18, 0.25) });
  drawText("Description", 48, y, 10, rgb(0.8, 0.82, 0.9), "bold");
  drawText("Qty", width / 2, y, 10, rgb(0.8, 0.82, 0.9), "bold");
  drawText("Unit", width / 2 + 60, y, 10, rgb(0.8, 0.82, 0.9), "bold");
  drawText("Total", width - 120, y, 10, rgb(0.8, 0.82, 0.9), "bold");
  y -= 16;
  (invoice.items || []).forEach((item) => {
    drawText(item.description || "-", 48, y);
    drawText(item.quantity ?? "-", width / 2, y);
    drawText(item.unit_price ?? "-", width / 2 + 60, y);
    drawText(Number(item.total || 0).toFixed(2), width - 120, y);
    y -= 14;
  });

  y -= 10;
  drawText(`Notes: ${invoice.notes || "N/A"}`, 40, y);
  y -= 16;
  drawText(`Payment terms: ${settings.payment_terms || "Due on receipt."}`, 40, y);
  y -= 30;
  drawText(settings.footer_text || "Thank you for your business.", 40, y, 10, rgb(0.7, 0.72, 0.8));

  return pdfDoc.save();
};

router.get("/generate-number", async (_req, res) => {
  try {
    const num = await nextNumber();
    res.json({ invoice_number: num });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate number" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const rows = await all(
      `SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
       FROM invoices
       LEFT JOIN clients ON invoices.client_id = clients.id
       ORDER BY datetime(date) DESC`
    );
    const hydrated = (rows || []).map((r) =>
      withStatus({
        ...r,
        items: r.items ? JSON.parse(r.items) : [],
      })
    );
    res.json(hydrated);
  } catch (err) {
    res.status(500).json({ error: "Failed to load invoices" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const row = await get(
      `SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
       FROM invoices
       LEFT JOIN clients ON invoices.client_id = clients.id
       WHERE invoices.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(
      withStatus({
        ...row,
        items: row.items ? JSON.parse(row.items) : [],
      })
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const items = payload.items || [];
    const settings = await getSettingsMap();
    const totals = computeTotals(items, settings);
    let clientId = payload.client_id;

    if (!clientId && payload.client_name) {
      const clientResult = await run(
        "INSERT INTO clients (name, address, phone, email) VALUES (?, ?, ?, ?)",
        [payload.client_name, payload.client_address || "", payload.client_phone || "", payload.client_email || ""]
      );
      clientId = clientResult.lastID;
    }
    if (!clientId) return res.status(400).json({ error: "client_id or client_name required" });

    const invoiceNumber = payload.invoice_number || (await nextNumber());
    const result = await run(
      "INSERT INTO invoices (client_id, invoice_number, date, due_date, items, subtotal, vat, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        clientId,
        invoiceNumber,
        payload.date || new Date().toISOString(),
        payload.due_date || null,
        JSON.stringify(totals.items),
        totals.subtotal,
        totals.vat,
        totals.total,
        payload.notes || "",
      ]
    );
    const row = await get(
      `SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
       FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?`,
      [result.lastID]
    );
    res.status(201).json(
      withStatus({
        ...row,
        items: totals.items,
      })
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const payload = req.body || {};
    let clientId = payload.client_id ?? existing.client_id;
    if (!clientId && payload.client_name) {
      const clientResult = await run(
        "INSERT INTO clients (name, address, phone, email) VALUES (?, ?, ?, ?)",
        [payload.client_name, payload.client_address || "", payload.client_phone || "", payload.client_email || ""]
      );
      clientId = clientResult.lastID;
    }
    const settings = await getSettingsMap();
    const items = payload.items || (existing.items ? JSON.parse(existing.items) : []);
    const totals = computeTotals(items, settings);
    await run(
      "UPDATE invoices SET client_id = ?, invoice_number = ?, date = ?, due_date = ?, items = ?, subtotal = ?, vat = ?, total = ?, notes = ? WHERE id = ?",
      [
        clientId,
        payload.invoice_number ?? existing.invoice_number ?? (await nextNumber()),
        payload.date ?? existing.date,
        payload.due_date ?? existing.due_date,
        JSON.stringify(totals.items),
        totals.subtotal,
        totals.vat,
        totals.total,
        payload.notes ?? existing.notes,
        req.params.id,
      ]
    );
    const row = await get(
      `SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
       FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?`,
      [req.params.id]
    );
    res.json(
      withStatus({
        ...row,
        items: totals.items,
      })
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await run("DELETE FROM invoices WHERE id = ?", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

router.get("/pdf/:id", async (req, res) => {
  try {
    const row = await get(
      `SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
       FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    const invoice = { ...row, items: row.items ? JSON.parse(row.items) : [] };
    const settings = await getSettingsMap();
    const pdfBytes = await buildPdf(invoice, settings);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename="invoice-${invoice.invoice_number || invoice.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

module.exports = router;
