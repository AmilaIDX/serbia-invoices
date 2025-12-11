const express = require("express");
const { run, getSettingsMap } = require("../db");

const router = express.Router();

router.get("/", async (_req, res) => {
  const map = await getSettingsMap();
  res.json(map);
});

router.post("/update", async (req, res) => {
  const payload = req.body || {};
  for (const [key, value] of Object.entries(payload)) {
    await run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );
  }
  const map = await getSettingsMap();
  res.json(map);
});

module.exports = router;
