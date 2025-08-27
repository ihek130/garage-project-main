// Script to initialize SQLite tables for the garage project
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT,
    rate REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `DROP TABLE IF EXISTS employee_task;`,
  `CREATE TABLE employee_task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Employee TEXT,
    Company TEXT,
    Date TEXT,
    Title TEXT,
    Details TEXT,
    Hours REAL,
    Rate REAL,
    Amount REAL,
    Status TEXT,
    Location TEXT,
    invoice_id INTEGER,
    FOREIGN KEY (invoice_id) REFERENCES invoice (id)
  );`,
  `CREATE TABLE IF NOT EXISTS employeesalaary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    job_title TEXT,
    date TEXT,
    salary REAL,
    salary_status TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    vehicle TEXT,
    description TEXT,
    date TEXT,
    contact TEXT,
    amount REAL,
    location TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    company TEXT,
    description TEXT,
    hours REAL,
    rate REAL,
    amount REAL,
    date TEXT,
    status TEXT,
    advance REAL,
    pending REAL,
    template_path TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );`,
  `CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    description TEXT,
    date TEXT,
    amount REAL,
    status TEXT,
    invoice_id INTEGER,
    task_id INTEGER,
    FOREIGN KEY (invoice_id) REFERENCES invoice (id),
    FOREIGN KEY (task_id) REFERENCES employee_task (id)
  );`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    vehicle TEXT,
    description TEXT,
    date TEXT,
    amount REAL,
    payment_status TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    vehicle TEXT,
    description TEXT,
    date TEXT,
    location TEXT,
    charges REAL
  );`,
  `CREATE TABLE IF NOT EXISTS pending (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    amount REAL,
    date TEXT,
    status TEXT
  );`
];

tableStatements.forEach((stmt) => {
  db.run(stmt, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    }
  });
});

db.close(() => {
  console.log('SQLite tables initialized.');
});
