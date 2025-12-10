const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { init, DB_FILE } = require("./db");
const authRoutes = require("./routes/auth");
const clientsRoutes = require("./routes/clients");
const invoicesRoutes = require("./routes/invoices");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET environment variable");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", db: DB_FILE }));

app.use("/api/auth", authRoutes);

// auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = auth.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

app.use("/api/clients", clientsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/settings", settingsRoutes);

init().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}, DB at ${DB_FILE}`);
  });
});
