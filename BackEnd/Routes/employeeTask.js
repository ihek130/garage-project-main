// BackEnd/Routes/employeeTask.js
const express = require('express')
const router = express.Router()

const {
  postdata,
  getdata,
  getcusterexcel,
  updatedata,
  deletedata,
  groupedByEmployee,       // NEW
  postTaskByEmployee,      // NEW
  generateInvoice          // NEW - Auto invoice generation
} = require('../Controller/employeeTaskController');

// Existing routes (kept for backward compatibility)
router.post('/post/Etask', postdata);
router.get('/getexcel/:id', getcusterexcel);
router.get('/get/Etask', getdata);
// Aliases for frontend: /employeetask/get/E-employeetask, /employeetask/get/Employeetask, /employeetask/get
router.get('/get/E-employeetask', getdata);
router.get('/get/Employeetask', getdata);
router.get('/get', getdata);
router.delete('/delete/:id', deletedata);
router.put('/update/:id', updatedata);

// NEW: grouped view for accordion UI
router.get('/grouped', groupedByEmployee);

// NEW: add a task by selecting an employee from dropdown
router.post('/by-employee/:employeeId', postTaskByEmployee);

// NEW: generate invoice from completed tasks
router.post('/generate-invoice', generateInvoice);

module.exports = router;
