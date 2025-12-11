const express = require("express");
const bcrypt = require("bcryptjs");
const { get, run, all } = require("../db");

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  return next();
};

const ensureNotLastAdmin = async (userId) => {
  const target = await get("SELECT role FROM users WHERE id = ?", [userId]);
  if (!target) return { ok: false, reason: "User not found" };
  if (target.role !== "admin") return { ok: true };
  const admins = await get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  if (admins?.count <= 1) return { ok: false, reason: "Cannot remove the last admin" };
  return { ok: true };
};

router.get("/me", async (req, res) => {
  const row = await get("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.sub]);
  if (!row) return res.status(404).json({ error: "User not found" });
  res.json(row);
});

router.put("/me", async (req, res) => {
  const { name, email, password } = req.body || {};
  const hashed = password ? await bcrypt.hash(password, 12) : null;
  await run("UPDATE users SET name = ?, email = ?, password = COALESCE(?, password) WHERE id = ?", [
    name,
    email,
    hashed,
    req.user.sub,
  ]);
  const row = await get("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.sub]);
  res.json(row);
});

router.get("/", requireAdmin, async (_req, res) => {
  const rows = await all("SELECT id, name, email, role FROM users ORDER BY id ASC");
  res.json(rows || []);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, role = "admin" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "name, email, password required" });
  const hashed = await bcrypt.hash(password, 12);
  try {
    const result = await run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
      name,
      email,
      hashed,
      role,
    ]);
    const row = await get("SELECT id, name, email, role FROM users WHERE id = ?", [result.lastID]);
    res.status(201).json(row);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) return res.status(409).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const existing = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "User not found" });
  const { name, email, password, role } = req.body || {};
  const hashed = password ? await bcrypt.hash(password, 12) : null;
  if (existing.role === "admin" && role && role !== "admin") {
    const admins = await get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    if (admins?.count <= 1) return res.status(400).json({ error: "Cannot demote the last admin" });
  }
  await run("UPDATE users SET name = ?, email = ?, role = ?, password = COALESCE(?, password) WHERE id = ?", [
    name ?? existing.name,
    email ?? existing.email,
    role ?? existing.role,
    hashed,
    req.params.id,
  ]);
  const row = await get("SELECT id, name, email, role FROM users WHERE id = ?", [req.params.id]);
  res.json(row);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const guard = await ensureNotLastAdmin(req.params.id);
  if (!guard.ok) return res.status(400).json({ error: guard.reason });
  await run("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.sendStatus(204);
});

module.exports = router;
