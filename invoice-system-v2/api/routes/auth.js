const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, run } = require("../db");
const crypto = require("crypto");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  try {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/request-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });
  const user = await get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) return res.status(404).json({ error: "User not found" });
  const token = crypto.randomUUID();
  await run("UPDATE users SET reset_token = ? WHERE id = ?", [token, user.id]);
  res.json({ ok: true, reset_token: token, message: "Reset link generated" });
});

router.post("/reset", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  const user = await get("SELECT * FROM users WHERE reset_token = ?", [token]);
  if (!user) return res.status(400).json({ error: "Invalid token" });
  const hashed = bcrypt.hashSync(password, 10);
  await run("UPDATE users SET password = ?, reset_token = NULL WHERE id = ?", [hashed, user.id]);
  res.json({ ok: true });
});

module.exports = router;
