const express = require("express");
const { all, run, db } = require("../db");

const router = express.Router();

router.get("/", async (_req, res) => {
  const rows = await all("SELECT key, value FROM settings");
  const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(map);
});

router.post("/update", async (req, res) => {
  const payload = req.body || {};
  Object.entries(payload).forEach(([key, value]) => {
    db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [key, value, value]
    );
  });
  res.json({ success: true });
});

module.exports = router;
