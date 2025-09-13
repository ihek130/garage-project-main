// BackEnd/server.js
console.log("Step 1: Starting main server...");

// Load environment variables
require('dotenv').config();

// Add process event listeners to catch any exits
process.on('exit', (code) => {
  console.log(`❌ Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const express = require("express");
console.log("Step 2: Express loaded");

const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
console.log("Step 3: Dependencies loaded");

const app = express();
console.log("Step 4: App created");

const Port = process.env.PORT || 5000;
console.log("Step 5: Port set to", Port);

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
console.log("Step 6: Middleware configured with CORS origin:", corsOrigin);

// Static files
// Static Files Path
const uploadsPath = process.env.UPLOADS_PATH || './assets/uploads';
const templatesPath = process.env.TEMPLATES_PATH || './assets/templates';
const invoiceFilesPath = process.env.INVOICE_FILES_PATH || './assets/invoice_files';
const assetsPath = process.env.ASSETS_PATH || './assets';

app.use('/assets/uploads', express.static(uploadsPath));
app.use('/templates', express.static(templatesPath));
app.use('/invoice_files', express.static(invoiceFilesPath));
app.use('/assets', express.static(assetsPath));
console.log("Step 7: Static file paths configured:", { uploadsPath, templatesPath, invoiceFilesPath, assetsPath });

// Database connection
const connectDB = require("./Config/db");
console.log("Step 8: Database connected");

// Check if employee_task table exists
connectDB.get("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_task'", (err, row) => {
  if (err) {
    console.error("Error checking tables:", err);
  } else if (!row) {
    console.log("⚠️  WARNING: employee_task table not found. Please run: node init_sqlite_db.js");
  } else {
    console.log("✅ employee_task table exists");
  }
});

// Test endpoint
app.get("/", (req, res) => {
  console.log("Request received!");
  res.json({ message: "Server is working!" });
});

// Test automation endpoint
app.post("/test-automation", (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: "taskId required" });
  }
  
  // Update task to completed status to trigger automation
  connectDB.run("UPDATE employee_task SET Status = 'completed' WHERE id = ?", [taskId], function(err) {
    if (err) {
      console.error("Test automation error:", err);
      return res.status(500).json({ error: "Failed to update task" });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ 
      message: "Task marked as completed - check income for automatic entry",
      taskId: taskId,
      changes: this.changes
    });
  });
});
console.log("Step 9: Routes configured");

// Add the employee task route (our main automation feature)
try {
  const employeetask = require("./Routes/employeeTask");
  app.use("/api/employeetask", employeetask);
  app.use("/employeetask", employeetask); // Legacy support
  console.log("Step 10: Employee task route loaded");
} catch (error) {
  console.error("Error loading employee task route:", error);
}

// Add employee route (for managing employees)
try {
  const employee = require("./Routes/employee");
  app.use("/api/employee", employee);
  app.use("/employee", employee); // Legacy support
  console.log("Step 11: Employee route loaded");
} catch (error) {
  console.error("Error loading employee route:", error);
}

// Add reports route (our financial reporting) - TEMPORARILY DISABLED
// try {
//   const reports = require("./Routes/reports");
//   app.use("/api/reports", reports);
//   console.log("Step 12: Reports route loaded");
// } catch (error) {
//   console.error("Error loading reports route:", error);
// }
console.log("Step 12: Reports route temporarily disabled");

// Add other essential routes
try {
  const customer = require("./Routes/customer");
  app.use("/api/customer", customer);
  app.use("/customer", customer);
  console.log("Step 13: Customer route loaded");
} catch (error) {
  console.error("Error loading customer route:", error);
}

try {
  const invoice = require("./Routes/invoice");
  app.use("/api/invoice", invoice);
  app.use("/invoice", invoice);
  console.log("Step 14: Invoice route loaded");
} catch (error) {
  console.error("Error loading invoice route:", error);
}

try {
  const invoiceFiles = require("./Routes/invoiceFiles");
  app.use("/api/invoice", invoiceFiles);
  app.use("/invoice", invoiceFiles);
  console.log("Step 14b: Invoice files route loaded");
} catch (error) {
  console.error("Error loading invoice files route:", error);
}

try {
  const templates = require("./Routes/templates");
  app.use("/api/templates", templates);
  app.use("/templates", templates);
  console.log("Step 14c: Templates route loaded");
} catch (error) {
  console.error("Error loading templates route:", error);
}

try {
  const income = require("./Routes/income");
  app.use("/api/income", income);
  app.use("/income", income);
  console.log("Step 15: Income route loaded");
} catch (error) {
  console.error("Error loading income route:", error);
}

try {
  const expense = require("./Routes/expenses");
  app.use("/api/expense", expense);
  app.use("/expense", expense);
  console.log("Step 16: Expense route loaded");
} catch (error) {
  console.error("Error loading expense route:", error);
}

// Add pending route (for pending tasks and payments)
try {
  const pending = require("./Routes/pending");
  app.use("/api/pending", pending);
  app.use("/pending", pending);
  console.log("Step 17: Pending route loaded");
} catch (error) {
  console.error("Error loading pending route:", error);
}

// Add SOA (Statement of Account) route
try {
  const soa = require("./Routes/soa");
  app.use("/api/soa", soa);
  app.use("/soa", soa);
  console.log("Step 18: SOA route loaded");
} catch (error) {
  console.error("Error loading SOA route:", error);
}

// Add employee salary route
try {
  const employeeSalary = require("./Routes/employeeSalary");
  app.use("/employeesalary", employeeSalary);
  console.log("Step 19: Employee salary route loaded");
} catch (error) {
  console.error("Error loading employee salary route:", error);
}

// Add employee details route (for details and uploads)
try {
  const employeeDetails = require("./Routes/employeeDetails");
  app.use("/api/employeedetails", employeeDetails);
  app.use("/employeedetails", employeeDetails); // Legacy support
  console.log("Step 20: Employee details route loaded");
} catch (error) {
  console.error("Error loading employee details route:", error);
}

console.log("Step 20: All essential automation routes loaded");

// -------- Start server --------
const server = app.listen(Port, () => {
  console.log(`✅ Server is running on port ${Port}`);
  console.log(`Visit: http://localhost:${Port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

console.log("Step 6: Server setup complete");

// Reduce the keep-alive interval now that it's working
setInterval(() => {
  console.log("✅ Server healthy - automation features active");
}, 30000); // Every 30 seconds instead of 5
