// BackEnd/Routes/invoiceFiles.js
// Upload & list invoice attachments (PDF/images) stored on disk.
// Returns web-accessible paths under /assets/...

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// Ensure base folders exist
const ASSETS_DIR = path.join(__dirname, "..", "assets");
const BASE_DIR = path.join(ASSETS_DIR, "invoice_files");
for (const p of [ASSETS_DIR, BASE_DIR]) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ensureInvoiceDir(invoiceId) {
  const dir = path.join(BASE_DIR, String(invoiceId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Multer storage: put files in assets/invoice_files/:invoiceId
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const invoiceId = req.params.id;
    const dir = ensureInvoiceDir(invoiceId);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeBase = String(file.originalname).replace(/[^\w.\-()+\s]/g, "_");
    const stamp = Date.now();
    cb(null, `${stamp}__${safeBase}`);
  },
});

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only PDF and image files are allowed."));
  },
});

// POST /invoice/:id/files  (field: files)  -> upload multiple
router.post("/:id/files", upload.array("files", 10), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const files = (req.files || []).map((f) => ({
      id: path.basename(f.filename), // use filename as id
      original_name: f.originalname,
      mime_type: f.mimetype,
      size: f.size,
      // public path (served by express static /assets)
      file_path: `assets/invoice_files/${invoiceId}/${path.basename(f.filename)}`,
    }));
    return res.json({ ok: true, files });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ ok: false, Message: e.message || "Upload failed" });
  }
});

// GET /invoice/:id/files -> list files
router.get("/:id/files", async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const dir = ensureInvoiceDir(invoiceId);
    const names = fs.readdirSync(dir).filter((n) => !n.startsWith("."));
    const files = names.map((name) => {
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      return {
        id: name,
        original_name: name.replace(/^\d+__/, ""), // best effort
        mime_type: undefined, // unknown without DB; client doesn’t require it
        size: st.size,
        file_path: `assets/invoice_files/${invoiceId}/${name}`,
        created_at: st.birthtime || st.ctime,
      };
    });
    // newest first
    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ ok: true, files });
  } catch (e) {
    // if folder missing, return empty
    if (e.code === "ENOENT") return res.json({ ok: true, files: [] });
    console.error(e);
    return res.status(400).json({ ok: false, Message: "Failed to list files" });
  }
});

module.exports = router;
