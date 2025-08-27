// BackEnd/Routes/reports.js
const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getCompanyPerformance,
  getMonthlyTrends
} = require('../Controller/reportController');

// Automated dashboard with financial metrics
router.get('/dashboard', getDashboard);

// Company performance analysis
router.get('/company-performance', getCompanyPerformance);

// Monthly income/expense trends
router.get('/monthly-trends', getMonthlyTrends);

module.exports = router;
