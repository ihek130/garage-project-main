const express = require('express');
const router = express.Router();
const soaController = require('../Controller/soaController');

// Get all companies for dropdown
router.get('/companies', soaController.getCompanies);

// Get SOA data with filters
router.get('/data', soaController.getSOAData);

// Get SOA summary for dashboard
router.get('/summary', soaController.getSOASummary);

// Get monthly breakdown for a company
router.get('/monthly', soaController.getMonthlyBreakdown);

// Download SOA as PDF
router.get('/download/pdf', soaController.downloadSOAPDF);

// Download SOA as Excel
router.get('/download/excel', soaController.downloadSOAExcel);

module.exports = router;