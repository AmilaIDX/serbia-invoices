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
  db.get("SELECT COUNT(*) AS count FROM invoice_counter", (err, row) => {
    if (!err && row && row.count === 0) {
      db.run("INSERT INTO invoice_counter (current) VALUES (0)");
    }
  });
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const existing = await get("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);
    const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    if (existing) {
      await run("UPDATE users SET password = ?, name = ? WHERE id = ?", [hashed, ADMIN_NAME, existing.id]);
    } else {
      await run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
        ADMIN_NAME,
        ADMIN_EMAIL,
        hashed,
        "admin",
      ]);
    }
  }
};

module.exports = { db, run, get, all, init, DB_FILE };
