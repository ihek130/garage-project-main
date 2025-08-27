// BackEnd/Controller/pendingController.js
const db = require("../Config/db");

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Updated to use SQLite for all operations
 * ─────────────────────────────────────────────────────────────────────────────
 */

// POST /pending/post/E-pending
exports.postdata = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ Message: "No data provided" });
    }
    // Build keys and values for SQLite
    const keys = Object.keys(payload).join(", ");
    const placeholders = Object.keys(payload).map(() => "?").join(", ");
    const values = Object.values(payload);
    const sql = `INSERT INTO pending (${keys}) VALUES (${placeholders})`;
    db.run(sql, values, function(err) {
      if (err) {
        console.error("pending.postdata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      res.status(201).json({ Message: "Created", id: this.lastID });
    });
  } catch (e) {
    console.error("pending.postdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /pending/get/E-pending
exports.getdata = async (_req, res) => {
  try {
    db.all("SELECT * FROM pending ORDER BY id DESC", (err, rows) => {
      if (err) {
        console.error("pending.getdata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      res.json(rows);
    });
  } catch (e) {
    console.error("pending.getdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// PUT /pending/update/:id
exports.updatedata = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    if (!id) return res.status(400).json({ Message: "Missing id" });
    // Build SET clause for SQLite
    const setClause = Object.keys(payload).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(payload), id];
    const sql = `UPDATE pending SET ${setClause} WHERE id = ?`;
    db.run(sql, values, function(err) {
      if (err) {
        console.error("pending.updatedata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (this.changes === 0) return res.status(404).json({ Message: "Not found" });
      res.json({ Message: "Updated" });
    });
  } catch (e) {
    console.error("pending.updatedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// DELETE /pending/delete/:id
exports.deletedata = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ Message: "Missing id" });
    db.run("DELETE FROM pending WHERE id = ?", [id], function(err) {
      if (err) {
        console.error("pending.deletedata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (this.changes === 0) return res.status(404).json({ Message: "Not found" });
      res.json({ Message: "Deleted" });
    });
  } catch (e) {
    console.error("pending.deletedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * New: Derived Pending from `invoice` table (single source of truth)
 * Endpoints under /pending/derived/...
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Helper: normalize pending from amount/advance if `pending` column is blank
function computePending(amount, advance, pending) {
  const amt = Number(amount || 0);
  const adv = Number(advance || 0);
  const pen = Number(pending || 0);
  if (isFinite(pen) && pen > 0) return pen;
  return Math.max(amt - adv, 0);
}

// GET /pending/derived/summary
// Returns overall totals across all invoices
exports.listSummary = async (_req, res) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT amount, advance, pending, status FROM invoice", (err, r) =>
        err ? reject(err) : resolve(r)
      );
    });

    let totalAmount = 0;
    let totalPending = 0;
    for (const r of rows) {
      const amt = Number(r.amount || 0);
      totalAmount += amt;
      totalPending += computePending(r.amount, r.advance, r.pending);
    }
    const totalReceived = Math.max(totalAmount - totalPending, 0);

    res.json({
      totals: {
        totalAmount,
        totalPending,
        totalReceived,
        projectedAfterPending: totalAmount,
      },
    });
  } catch (e) {
    console.error("pending.listSummary exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// GET /pending/derived/by-customer/:key  (key = id or name)
// Returns only invoices that are still pending for this customer
exports.listByCustomerPending = async (req, res) => {
  try {
    let key = req.params.key;
    if (!key) return res.status(400).json({ Message: "Customer key is required" });

    // Resolve name if key is numeric id
    let name = null;
    if (/^\d+$/.test(String(key))) {
      const id = Number(key);
      const row = await new Promise((resolve, reject) => {
        db.get("SELECT name FROM customers WHERE id = ?", [id], (err, row) =>
          err ? reject(err) : resolve(row)
        );
      });
      if (!row) return res.status(404).json({ Message: "Customer not found" });
      name = row.name;
    } else {
      name = key;
    }

    // Pull this customer's invoices and filter pending
    const invoices = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM invoice WHERE customer_name = ? ORDER BY id DESC", [name], (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    const pendingOnly = invoices.filter((inv) => {
      const p = computePending(inv.amount, inv.advance, inv.pending);
      // Consider pending if: status is "pending" OR computed pending > 0
      const statusPending = String(inv.status || "").toLowerCase() === "pending";
      return statusPending || p > 0;
    });

    res.json({ customer: name, invoices: pendingOnly });
  } catch (e) {
    console.error("pending.listByCustomerPending exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// POST /pending/derived/add
// Creates a new "pending" invoice (writes into `invoice`)
exports.addPendingInvoice = async (req, res) => {
  try {
    const body = req.body || {};
    // Expect at least: name (customer), amount
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ Message: "Customer name is required" });
    }
    if (body.amount == null) {
      return res.status(400).json({ Message: "Amount is required" });
    }

    const payload = {
      ...body,
      status: body.status || "pending",
      pending:
        body.pending != null
          ? body.pending
          : computePending(body.amount, body.advance, body.pending),
    };

    await new Promise((resolve, reject) => {
      // Convert to SQLite INSERT syntax
      const keys = Object.keys(payload).join(", ");
      const placeholders = Object.keys(payload).map(() => "?").join(", ");
      const values = Object.values(payload);
      const sql = `INSERT INTO invoice (${keys}) VALUES (${placeholders})`;
      
      db.run(sql, values, function(err) {
        err ? reject(err) : resolve(this.lastID);
      });
    });

    res.status(201).json({ Message: "Pending invoice created" });
  } catch (e) {
    console.error("pending.addPendingInvoice exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// PATCH /pending/derived/mark-received/:invoiceId
// Supports full or partial payments by sending { amountReceived }
exports.markInvoiceReceived = async (req, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId);
    if (!invoiceId) return res.status(400).json({ Message: "Invalid invoice id" });

    const body = req.body || {};
    const amountReceived = Number(body.amountReceived || 0);

    // Load current invoice
    const inv = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM invoice WHERE id = ?", [invoiceId], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });
    if (!inv) return res.status(404).json({ Message: "Invoice not found" });

    const currentAdvance = Number(inv.advance || 0);
    const currentAmount = Number(inv.amount || 0);
    const currentPending = computePending(inv.amount, inv.advance, inv.pending);

    // Compute new values
    const newAdvance = currentAdvance + (isFinite(amountReceived) ? amountReceived : 0);
    const newPending = Math.max(currentAmount - newAdvance, 0);
    const newStatus = newPending > 0 ? "pending" : "received";

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE invoice SET advance = ?, pending = ?, status = ? WHERE id = ?",
        [newAdvance, newPending, newStatus, invoiceId],
        function(err) { 
          err ? reject(err) : resolve(this.changes);
        }
      );
    });

    // Automatically create income entry for the payment received
    if (amountReceived > 0) {
      await createIncomeFromPayment(inv, amountReceived);
    }

    res.json({
      Message: "Invoice updated",
      updated: { advance: newAdvance, pending: newPending, status: newStatus },
      incomeCreated: amountReceived > 0
    });
  } catch (e) {
    console.error("pending.markInvoiceReceived exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

// Helper function to create income entry from invoice payment
const createIncomeFromPayment = async (invoice, amountReceived) => {
  try {
    const db = require('../Config/db');
    const incomeData = {
      source: `Payment from ${invoice.customer_name || invoice.customer || 'Customer'}`,
      description: `Invoice #${invoice.invoice_no || invoice.id} payment - ${invoice.description || 'Service payment'}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountReceived,
      status: 'confirmed',
      invoice_id: invoice.id,
      source_type: 'invoice_payment',
      source_id: invoice.id
    };

    const query = `
      INSERT INTO income (source, description, date, amount, status, invoice_id, source_type, source_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await new Promise((resolve, reject) => {
      db.run(query, [
        incomeData.source,
        incomeData.description,
        incomeData.date,
        incomeData.amount,
        incomeData.status,
        incomeData.invoice_id,
        incomeData.source_type,
        incomeData.source_id
      ], function(err) {
        if (err) {
          console.error('Error creating income entry:', err);
          reject(err);
        } else {
          console.log(`✅ Auto-created income entry: ${incomeData.source} - AED ${amountReceived}`);
          resolve(this.lastID);
        }
      });
    });
  } catch (error) {
    console.error('Error in createIncomeFromPayment:', error);
  }
};
