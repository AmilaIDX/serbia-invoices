const express = require("express");
const { all, get, run } = require("../db");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const router = express.Router();

const computeTotals = (items = [], vat = 0) => {
  const enriched = items.map((i) => ({
    ...i,
    quantity: Number(i.quantity || 0),
    price: Number(i.price || i.unit_price || 0),
  }));
  const subtotal = enriched.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const vatAmount = vat ? subtotal * (Number(vat) / 100) : 0;
  const total = subtotal + vatAmount;
  return { items: enriched.map((i) => ({ ...i, total: i.quantity * i.price })), subtotal, vat: vatAmount, total };
};

const nextNumber = async () => {
  const latest = await get("SELECT id FROM invoices ORDER BY id DESC LIMIT 1");
  const next = (latest?.id || 0) + 1;
  return `INV-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
};

const buildPdf = async (invoice) => {
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
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: headerBg });
  drawText("Invoice", 40, height - 50, 22, accent, "bold");
  drawText(`Invoice #: ${invoice.id}`, 40, height - 75, 12, rgb(0, 0, 0), "bold");
  drawText(`Date: ${invoice.date || "-"}`, 40, height - 95);
  drawText(`Due: ${invoice.due_date || "-"}`, 40, height - 110);
  drawText("Bill To", 40, height - 150, 12, accent, "bold");
  drawText(invoice.client_name || "-", 40, height - 170, 12, rgb(0, 0, 0), "bold");
  drawText(invoice.notes || "", 40, height - 190);
  let y = height - 230;
  drawText("Items", 40, y, 12, accent, "bold");
  y -= 16;
  page.drawRectangle({ x: 35, y: y - 6, width: width - 70, height: 22, color: headerBg });
  drawText("Description", 40, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Qty", 300, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Unit", 360, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  drawText("Total", 430, y, 10, rgb(0.2, 0.2, 0.2), "bold");
  y -= 14;
  (invoice.items || []).forEach((item) => {
    drawText(item.description || "-", 40, y);
    drawText(item.quantity ?? "-", 300, y);
    drawText(item.price ?? item.unit_price ?? "-", 360, y);
    drawText(item.total ?? "-", 430, y);
    y -= 14;
  });
  y -= 10;
  drawText(`Subtotal: ${Number(invoice.subtotal || 0).toFixed(2)}`, 40, y, 12, accent, "bold");
  y -= 14;
  drawText(`VAT: ${Number(invoice.vat || 0).toFixed(2)}`, 40, y, 12, accent, "bold");
  y -= 14;
  drawText(`Total: ${Number(invoice.total || 0).toFixed(2)}`, 40, y, 14, accent, "bold");
  return pdfDoc.save();
};

router.get("/", async (_req, res) => {
  const rows = await all(
    "SELECT invoices.*, clients.name as client_name FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id ORDER BY datetime(date) DESC"
  );
  const hydrated = rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : [] }));
  res.json(hydrated || []);
});

router.get("/:id", async (req, res) => {
  const row = await get(
    "SELECT invoices.*, clients.name as client_name FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?",
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const items = payload.items || payload.line_items || [];
  const { subtotal, vat, total } = computeTotals(items, payload.vat || 0);
  let clientId = payload.client_id;
  if (!clientId && payload.client_name) {
    const client = await run(
      "INSERT INTO clients (name, address, phone, email) VALUES (?, ?, ?, ?)",
      [payload.client_name, payload.client_address || "", payload.client_phone || "", payload.client_email || ""]
    );
    clientId = client.lastID;
  }
  if (!clientId) return res.status(400).json({ error: "client_id or client_name required" });
  const result = await run(
    "INSERT INTO invoices (client_id, date, due_date, items, subtotal, vat, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      clientId,
      payload.date || payload.issue_date || new Date().toISOString(),
      payload.due_date || null,
      JSON.stringify(items),
      subtotal,
      vat,
      total,
      payload.notes || "",
    ]
  );
  const row = await get(
    "SELECT invoices.*, clients.name as client_name FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?",
    [result.lastID]
  );
  res.status(201).json({ ...row, items });
});

router.put("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const payload = req.body || {};
  const items = payload.items || payload.line_items || (existing.items ? JSON.parse(existing.items) : []);
  const totals = computeTotals(items, payload.vat ?? existing.vat ?? 0);
  let clientId = payload.client_id ?? existing.client_id;
  if (!clientId && payload.client_name) {
    const client = await run(
      "INSERT INTO clients (name, address, phone, email) VALUES (?, ?, ?, ?)",
      [payload.client_name, payload.client_address || "", payload.client_phone || "", payload.client_email || ""]
    );
    clientId = client.lastID;
  }
  await run(
    "UPDATE invoices SET client_id = ?, date = ?, due_date = ?, items = ?, subtotal = ?, vat = ?, total = ?, notes = ? WHERE id = ?",
    [
      clientId,
      payload.date ?? payload.issue_date ?? existing.date,
      payload.due_date ?? existing.due_date,
      JSON.stringify(items),
      totals.subtotal,
      totals.vat,
      totals.total,
      payload.notes ?? existing.notes,
      req.params.id,
    ]
  );
  const row = await get(
    "SELECT invoices.*, clients.name as client_name FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?",
    [req.params.id]
  );
  res.json({ ...row, items });
});

router.delete("/:id", async (req, res) => {
  await run("DELETE FROM invoices WHERE id = ?", [req.params.id]);
  res.sendStatus(204);
});

router.get("/pdf/:id", async (req, res) => {
  const row = await get(
    "SELECT invoices.*, clients.name as client_name FROM invoices LEFT JOIN clients ON invoices.client_id = clients.id WHERE invoices.id = ?",
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "Not found" });
  const invoice = { ...row, items: row.items ? JSON.parse(row.items) : [] };
  const pdfBytes = await buildPdf(invoice);
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", `inline; filename=\"invoice-${invoice.id}.pdf\"`);
  res.send(Buffer.from(pdfBytes));
});

router.get("/generate-number", async (_req, res) => {
  const num = await nextNumber();
  res.json({ invoice_number: num });
});

module.exports = router;
