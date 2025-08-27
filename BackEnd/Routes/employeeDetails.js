// BackEnd/Routes/employeeDetails.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const {
  updateEmployeeDetails,
  getEmployeeDetails
} = require('../Controller/employeeDetailsController');

// Update employee details (with file upload)
router.post('/update', upload.fields([
  { name: 'labour_card_picture', maxCount: 1 },
  { name: 'passport_picture', maxCount: 1 },
  { name: 'emirates_id_picture', maxCount: 1 }
]), updateEmployeeDetails);

// Get employee details by ID
router.get('/:id', getEmployeeDetails);

module.exports = router;
