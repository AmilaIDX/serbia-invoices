const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const DB_FILE = process.env.DB_FILE || "/data/invoices.db";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

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

const init = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const raw = fs.readFileSync(schemaPath, "utf8");
  const stmts = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of stmts) {
    await run(stmt);
  }

  const counterRow = await get("SELECT COUNT(*) as count FROM invoice_counter");
  if (!counterRow || counterRow.count === 0) {
    await run("INSERT INTO invoice_counter (value) VALUES (0)");
  }

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existing = await get("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);
    if (existing) {
      await run("UPDATE users SET name = ?, password = ?, role = 'admin' WHERE id = ?", [
        ADMIN_NAME || "Administrator",
        hashed,
        existing.id,
      ]);
    } else {
      await run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')", [
        ADMIN_NAME || "Administrator",
        ADMIN_EMAIL,
        hashed,
      ]);
    }
  }

  // Default invoice settings
  const defaults = [
    ["invoice_prefix", "INV"],
    ["invoice_padding", "5"],
    ["company_name", "Your Company"],
    ["company_email", ""],
    ["company_phone", ""],
    ["company_address", ""],
    ["company_tax", ""],
    ["invoice_start", "1"],
    ["default_vat_rate", "0"],
    ["payment_terms", "Payment due within 14 days."],
    ["footer_text", "Thank you for your business."],
  ];
  for (const [key, value] of defaults) {
    await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING", [key, value]);
  }
};

const getSettingsMap = async () => {
  const rows = await all("SELECT key, value FROM settings");
  return (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
};

module.exports = { db, run, get, all, init, DB_FILE, getSettingsMap };
