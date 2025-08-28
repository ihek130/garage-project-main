// BackEnd/Routes/employee.js
const express = require("express");
const router = express.Router();

const {
  listEmployees,
  createEmployee,
  getdata,
  postdata
} = require("../Controller/employeeController");

// Standard endpoints that match other controllers
router.get("/getdata", getdata || listEmployees);
router.post("/postdata", postdata || createEmployee);

// GET /employee/employees  → list employees for dropdowns
router.get("/employees", listEmployees);
// Alias for frontend: /employee/get/employees
router.get("/get/employees", listEmployees);
// Alias for frontend: /employee/get
router.get("/get", listEmployees);

// POST /employee/employees → “+ Add new employee”
router.post("/employees", createEmployee);
// Alias for frontend: /employee/create
router.post("/create", createEmployee);
// Alias for frontend: /employee/post/employee
router.post("/post/employee", createEmployee);

module.exports = router;
