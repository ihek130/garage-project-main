// BackEnd/Controller/employeeController.js
const db = require("../Config/db");

/**
 * Ensure the `employees` table exists. We do this lazily so we don't break
 * existing deployments that never created this table.
 */
function ensureEmployeesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT,
      rate REAL,
      passport_number TEXT,
      passport_expiry TEXT,
      id_expiry TEXT,
      visa_expiry TEXT,
      labour_card_picture TEXT,
      passport_picture TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * If the employees table is empty, seed it from distinct names found in
 * employee_task and employeesalaary so you DO NOT lose any existing data.
 * (We keep names as-is to preserve history; no data loss.)
 */
async function seedEmployeesFromExistingDataIfEmpty() {
  const countSql = "SELECT COUNT(*) AS cnt FROM employees";
  const rows = await new Promise((resolve, reject) => {
    db.all(countSql, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
  const count = rows[0];
  if (count && count.cnt > 0) return; // already has data

  const unionSql = `
    SELECT DISTINCT Employee as name FROM employee_task WHERE Employee IS NOT NULL AND Employee <> ''
    UNION
    SELECT DISTINCT name FROM employeesalaary WHERE name IS NOT NULL AND name <> ''
  `;
  const names = await new Promise((resolve, reject) => {
    db.all(unionSql, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  if (!names || names.length === 0) return;

  const insertSql = "INSERT OR IGNORE INTO employees (name) VALUES (?)";
  await Promise.all(
    names.map((row) => {
      const n = (row.name || "").trim();
      return new Promise((resolve) => {
        if (!n) return resolve();
        db.run(insertSql, [n], () => resolve()); // ignore errors to keep idempotent
      });
    })
  );
}

/**
 * GET /employee/employees
 * Returns list of employees for dropdowns (id + name [+ optional fields])
 */
exports.listEmployees = async (req, res) => {
  try {
    await ensureEmployeesTable();
    await seedEmployeesFromExistingDataIfEmpty();

    db.all(
      "SELECT id, name, phone, role, rate FROM employees ORDER BY name ASC",
      (err, rows) => {
        if (err) {
          console.error("Error fetching employees:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        res.json({ rows });
      }
    );
  } catch (e) {
    console.error("listEmployees error:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * POST /employee/employees
 * Body: { name, phone?, role?, rate? }
 * Creates a new employee. Name must be unique.
 */
exports.createEmployee = async (req, res) => {
  try {
    const { name, phone = null, role = null, rate = null } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ Message: "Employee name is required" });
    }

    await ensureEmployeesTable();

    const sql =
      "INSERT INTO employees (name, phone, role, rate) VALUES (?, ?, ?, ?)";
    db.run(sql, [name.trim(), phone, role, rate], function(err) {
      if (err) {
        if (err.message && err.message.includes("UNIQUE")) {
          return res.status(409).json({ Message: "Employee already exists" });
        }
        console.error("Error creating employee:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      res.status(201).json({
        Message: "Employee created",
        employee: { id: this.lastID, name: name.trim(), phone, role, rate },
      });
    });
  } catch (e) {
    console.error("createEmployee error:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};
