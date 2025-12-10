const express = require("express");
const { get, run } = require("../db");

const router = express.Router();

router.get("/me", async (req, res) => {
  const row = await get("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.sub]);
  if (!row) return res.status(404).json({ error: "User not found" });
  res.json(row);
});

router.put("/me", async (req, res) => {
  const { name, email } = req.body || {};
  await run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.sub]);
  res.json({ success: true });
});

module.exports = router;
