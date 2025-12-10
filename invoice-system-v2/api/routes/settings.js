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
  await run("BEGIN");
  const stmt = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  Object.entries(payload).forEach(([k, v]) => stmt.run(k, String(v)));
  stmt.finalize();
  await run("COMMIT");
  const rows = await all("SELECT key, value FROM settings");
  const map = (rows || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(map);
});

module.exports = router;
