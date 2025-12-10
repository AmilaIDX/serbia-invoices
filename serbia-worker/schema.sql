CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  phone TEXT,
  reset_token TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  client_name TEXT,
  client_address TEXT,
  client_email TEXT,
  amount REAL,
  file_url TEXT,
  status TEXT,
  issue_date TEXT DEFAULT CURRENT_TIMESTAMP,
  due_date TEXT,
  line_items TEXT,
  total_amount REAL,
  timeline TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  address TEXT,
  applying_from TEXT,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,
  value TEXT
);
