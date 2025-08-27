// BackEnd/Routes/pendingDerived.js
// Mark amount received against an invoice, updating advance and (if column exists) pending/status.

const express = require("express");
const router = express.Router();
const db = require("../Config/db");

// Tiny cache of invoice columns so we only DESCRIBE once
let invoiceCols = null;
async function ensureInvoiceCols() {
  if (invoiceCols) return invoiceCols;
  invoiceCols = new Set();
  await new Promise((resolve) => {
    db.query("SHOW COLUMNS FROM `invoice`", (err, rows) => {
      if (!err && Array.isArray(rows)) {
        for (const r of rows) invoiceCols.add(r.Field.toLowerCase());
      }
      resolve(); // even on error, continue with empty set
    });
  });
  return invoiceCols;
}

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// PATCH /pending/derived/mark-received/:invoiceId  body: { amountReceived }
router.patch("/mark-received/:invoiceId", async (req, res) => {
  try {
    await ensureInvoiceCols();

    const invoiceId = req.params.invoiceId;
    const amt = Number(req.body?.amountReceived);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ ok: false, Message: "amountReceived must be > 0" });
    }

    // 1) Load current invoice
    const rows = await q(
      "SELECT id, amount, advance, " +
        (invoiceCols.has("pending") ? "pending," : "") +
        (invoiceCols.has("status") ? "status," : "") +
        " date, name FROM invoice WHERE id = ? LIMIT 1",
      [invoiceId]
    );
    if (!rows || !rows.length) {
      return res.status(404).json({ ok: false, Message: "Invoice not found" });
    }
    const inv = rows[0];
    const amount = Number(inv.amount || 0);
    const advance = Number(inv.advance || 0);
    const pendingColExists = invoiceCols.has("pending");
    const statusColExists = invoiceCols.has("status");

    // 2) Compute new values
    const newAdvance = advance + amt;
    const computedPending = Math.max(amount - newAdvance, 0);

    // 3) Update advance
    await q("UPDATE invoice SET advance = COALESCE(advance,0) + ? WHERE id = ?", [
      amt,
      invoiceId,
    ]);

    // 4) If there's a 'pending' column, keep it in sync with amount-advance
    if (pendingColExists) {
      await q("UPDATE invoice SET pending = GREATEST(amount - COALESCE(advance,0), 0) WHERE id = ?", [
        invoiceId,
      ]);
    }

    // 5) If there's a 'status' column, set to 'paid' when fully received, else 'partial'
    if (statusColExists) {
      const newStatus = computedPending <= 0 ? "paid" : "partial";
      await q("UPDATE invoice SET status = ? WHERE id = ?", [newStatus, invoiceId]);
    }

    // 6) Return fresh invoice snapshot
    const rows2 = await q(
      "SELECT id, amount, advance, " +
        (pendingColExists ? "pending," : "") +
        (statusColExists ? "status," : "") +
        " date, name FROM invoice WHERE id = ? LIMIT 1",
      [invoiceId]
    );
    const next = rows2[0] || null;

    return res.json({
      ok: true,
      invoice: next || {
        id: Number(invoiceId),
        amount,
        advance: newAdvance,
        ...(pendingColExists ? { pending: computedPending } : {}),
        ...(statusColExists ? { status: computedPending <= 0 ? "paid" : "partial" } : {}),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, Message: "Failed to mark received" });
  }
});

module.exports = router;
