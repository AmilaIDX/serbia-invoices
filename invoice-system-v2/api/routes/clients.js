const express = require("express");
const { all, get, run } = require("../db");

const router = express.Router();

router.get("/", async (_req, res) => {
  const rows = await all("SELECT * FROM clients ORDER BY name ASC");
  res.json(rows || []);
});

router.post("/", async (req, res) => {
  const { name, address = "", phone = "", email = "" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const result = await run("INSERT INTO clients (name, address, phone, email) VALUES (?, ?, ?, ?)", [
    name,
    address,
    phone,
    email,
  ]);
  const row = await get("SELECT * FROM clients WHERE id = ?", [result.lastID]);
  res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const existing = await get("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { name, address, phone, email } = req.body || {};
  await run("UPDATE clients SET name = ?, address = ?, phone = ?, email = ? WHERE id = ?", [
    name ?? existing.name,
    address ?? existing.address,
    phone ?? existing.phone,
    email ?? existing.email,
    req.params.id,
  ]);
  const row = await get("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  await run("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.sendStatus(204);
});

module.exports = router;
