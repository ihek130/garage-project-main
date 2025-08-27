const fs = require("fs");
const path = require("path");
const db = require("../Config/db");

// -----------------------------
// Existing endpoints (kept)
// -----------------------------

// POST /invoice/post/E-invoice
exports.postdata = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ Message: "No data provided" });
    }

    // Handle new invoice format
    if (payload.invoice_no && payload.customer && payload.items) {
      const invoiceData = {
        invoice_no: payload.invoice_no,
        customer_id: payload.customer_id || payload.customer.id,
        customer_name: payload.customer.name,
        customer_address: payload.customer.address,
        customer_phone: payload.customer.phone || '',
        customer_email: payload.customer.email || '',
        items: JSON.stringify(payload.items),
        notes: payload.notes || '',
        vat_rate: payload.vatRate || 5,
        subtotal: payload.totals.subtotal || 0,
        vat_amount: payload.totals.vat || 0,
        total_amount: payload.totals.total || 0,
        date: payload.date,
        status: 'pending'
      };

      const keys = Object.keys(invoiceData).join(", ");
      const placeholders = Object.keys(invoiceData).map(() => "?").join(", ");
      const values = Object.values(invoiceData);
      
      const sql = `INSERT INTO invoice (${keys}) VALUES (${placeholders})`;
      
      db.run(sql, values, function(err) {
        if (err) {
          console.error("invoice.postdata error:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        res.status(201).json({ Message: "Invoice created successfully", id: this.lastID });
      });
    } else {
      // Handle legacy format
      const keys = Object.keys(payload).join(", ");
      const placeholders = Object.keys(payload).map(() => "?").join(", ");
      const values = Object.values(payload);
      const sql = `INSERT INTO invoice (${keys}) VALUES (${placeholders})`;
      
      db.run(sql, values, function(err) {
        if (err) {
          console.error("invoice.postdata error:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        res.status(201).json({ Message: "Created", id: this.lastID });
      });
    }
  } catch (e) {
    console.error("invoice.postdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /invoice/get/E-invoice
exports.getdata = async (req, res) => {
  try {
    db.all("SELECT * FROM invoice ORDER BY id DESC", (err, rows) => {
      if (err) {
        console.error("invoice.getdata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
      // Parse items JSON for new format invoices
      const invoices = rows.map(row => {
        if (row.items) {
          try {
            row.items = JSON.parse(row.items);
          } catch (e) {
            // If parsing fails, keep as string
          }
        }
        return row;
      });
      
      res.json(invoices);
    });
  } catch (e) {
    console.error("invoice.getdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /invoice/getpdf/:id
exports.getcusterpdf = async (req, res) => {
  try {
    const id = req.params.id;
    db.all("SELECT * FROM invoice WHERE id = ?", [id], (err, rows) => {
      if (err) {
        console.error("invoice.getcusterpdf error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ Message: "Not found" });
      }
      res.json(rows[0]);
    });
  } catch (e) {
    console.error("invoice.getcusterpdf exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// PUT /invoice/update/:id
exports.updatedata = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const setClause = Object.keys(payload).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(payload), id];
    const sql = `UPDATE invoice SET ${setClause} WHERE id = ?`;
    db.run(sql, values, function(err) {
      if (err) {
        console.error("invoice.updatedata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ Message: "Not found" });
      }
      res.json({ Message: "Updated" });
    });
  } catch (e) {
    console.error("invoice.updatedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// DELETE /invoice/delete/:id
exports.deletedata = async (req, res) => {
  try {
    const id = req.params.id;
    db.run("DELETE FROM invoice WHERE id = ?", [id], function(err) {
      if (err) {
        console.error("invoice.deletedata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ Message: "Not found" });
      }
      res.json({ Message: "Deleted" });
    });
  } catch (e) {
    console.error("invoice.deletedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// -----------------------------
// New normalized endpoints
// -----------------------------

// Utility: ensure uploads dir exists
const UPLOAD_DIR = path.join(__dirname, "..", "assets", "uploads", "invoices");
function ensureUploadsDir() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (_) {}
  return UPLOAD_DIR;
}

// Utility: attachments table (one-to-many)
async function ensureInvoiceFilesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS invoice_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

// GET /invoice/by-customer/:key   (key = customer id OR name)
exports.listByCustomer = async (req, res) => {
  try {
    let key = req.params.key;
    if (!key) return res.status(400).json({ Message: "Customer key is required" });

    // If numeric id, resolve to customer name
    let name = null;
    if (/^\d+$/.test(String(key))) {
      const id = Number(key);
      const rows = await new Promise((resolve, reject) => {
        db.all("SELECT name FROM customers WHERE id = ?", [id], (err, rows) =>
          err ? reject(err) : resolve(rows)
        );
      });
      if (!rows || rows.length === 0) return res.status(404).json({ Message: "Customer not found" });
      name = rows[0].name;
    } else {
      name = key;
    }

    const invoices = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM invoice WHERE customer_name = ? OR company = ? ORDER BY id DESC", [name, name], (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    res.json({ customer: name, invoices });
  } catch (e) {
    console.error("invoice.listByCustomer exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /invoice/summary/by-customer/:key
exports.summaryByCustomer = async (req, res) => {
  try {
    let key = req.params.key;
    if (!key) return res.status(400).json({ Message: "Customer key is required" });

    let name = null;
    if (/^\d+$/.test(String(key))) {
      const id = Number(key);
      const rows = await new Promise((resolve, reject) => {
        db.all("SELECT name FROM customers WHERE id = ?", [id], (err, rows) =>
          err ? reject(err) : resolve(rows)
        );
      });
      if (!rows || rows.length === 0) return res.status(404).json({ Message: "Customer not found" });
      name = rows[0].name;
    } else {
      name = key;
    }

    // Use your common columns: amount, advance, pending
    const rows = await new Promise((resolve, reject) => {
      db.all(
        "SELECT amount, advance, pending FROM invoice WHERE customer_name = ? OR company = ?",
        [name, name],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    let totalAmount = 0;
    let totalAdvance = 0;
    let totalPending = 0;

    for (const r of rows) {
      const amt = Number(r.amount || 0);
      const adv = Number(r.advance || 0);
      const pen = Number(r.pending || 0);
      totalAmount += amt;
      totalAdvance += adv;
      // If pending column is blank, derive from amount - advance
      const p = (isFinite(pen) && pen !== 0) ? pen : Math.max(amt - adv, 0);
      totalPending += p;
    }
    const totalReceived = totalAmount - totalPending;

    res.json({
      customer: name,
      totals: {
        totalAmount,
        totalPending,
        totalReceived,
        projectedAfterPending: totalAmount
      },
      count: rows.length
    });
  } catch (e) {
    console.error("invoice.summaryByCustomer exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// POST /invoice/:id/files  (upload attachments)
exports.uploadFiles = async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ Message: "Invalid invoice id" });

    ensureUploadsDir();
    await ensureInvoiceFilesTable();

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ Message: "No files uploaded" });

    // Insert files one by one for SQLite
    const sql = "INSERT INTO invoice_files (invoice_id, file_path, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)";
    
    for (const f of files) {
      const values = [
        invoiceId,
        path.relative(path.join(__dirname, ".."), f.path).replace(/\\/g, "/"),
        f.originalname,
        f.mimetype,
        f.size || null,
      ];
      
      await new Promise((resolve, reject) => {
        db.run(sql, values, (err) => (err ? reject(err) : resolve()));
      });
    }

    res.status(201).json({ Message: "Files uploaded", count: files.length });
  } catch (e) {
    console.error("invoice.uploadFiles exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /invoice/:id/files
exports.listFiles = async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ Message: "Invalid invoice id" });
    await ensureInvoiceFilesTable();

    db.all(
      "SELECT id, invoice_id, file_path, original_name, mime_type, uploaded_at, size FROM invoice_files WHERE invoice_id = ? ORDER BY id DESC",
      [invoiceId],
      (err, rows) => {
        if (err) {
          console.error("invoice.listFiles error:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        res.json({ files: rows });
      }
    );
  } catch (e) {
    console.error("invoice.listFiles exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};
