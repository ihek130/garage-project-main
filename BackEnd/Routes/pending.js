// BackEnd/Routes/pending.js
const express = require("express");
const router = express.Router();

const {
  // legacy
  postdata,
  getdata,
  updatedata,
  deletedata,

  // derived from `invoice`
  listSummary,
  listByCustomerPending,
  addPendingInvoice,
  markInvoiceReceived,

  // automation functions
  refreshPendingEndpoint,
} = require("../Controller/pendingController");

// ── Legacy routes (kept) ───────────────────────────────────────────
router.post("/post/E-pending", postdata);
router.get("/get/E-pending", getdata);
router.put("/update/:id", updatedata);
router.delete("/delete/:id", deletedata);

// ── Automation routes ──────────────────────────────────────────────
router.get("/refresh", refreshPendingEndpoint);

// ── New derived routes (recommended) ───────────────────────────────
// Overall totals
router.get("/derived/summary", listSummary);

// Per-customer pending (id OR name)
router.get("/derived/by-customer/:key", listByCustomerPending);

// Add a new pending invoice (writes to `invoice`)
router.post("/derived/add", addPendingInvoice);

// Mark received (full or partial); body: { amountReceived }
router.patch("/derived/mark-received/:invoiceId", markInvoiceReceived);

module.exports = router;
