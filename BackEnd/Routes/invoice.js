const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  postdata,
  getdata,
  getcusterpdf,
  updatedata,
  deletedata,
  listByCustomer,       // NEW
  summaryByCustomer,    // NEW
  uploadFiles,          // NEW
  listFiles,            // NEW
} = require('../Controller/invoiceController');

// ------------------
// Keep old routes
// ------------------
router.post('/post/E-invoice', postdata);
router.get('/getpdf/:id', getcusterpdf);
router.get('/get/E-invoice', getdata);
router.delete('/delete/:id', deletedata);
router.put('/update/:id', updatedata);

// ------------------
// New routes
// ------------------

// Per-customer views (id OR name)
router.get('/by-customer/:key', listByCustomer);
router.get('/summary/by-customer/:key', summaryByCustomer);

// File uploads (attachments)
const uploadDir = path.join(__dirname, '..', 'assets', 'uploads', 'invoices');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const base = path.parse(file.originalname).name.replace(/\s+/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${base}${ext}`);
  }
});
const upload = multer({ storage });

// Attach multiple files (form-data field name = "files")
router.post('/:id/files', upload.array('files', 10), uploadFiles);
// List files for an invoice
router.get('/:id/files', listFiles);

module.exports = router;
