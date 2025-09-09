// BackEnd/Controller/employeeTaskController.js
const db = require("../Config/db");
// If you truly use an excel exporter, we can wire it up after compile.
// const exportexcel = require("../utils/excelexport");

/**
 * POST /employeetask/post/Etask
 * Body: any columns matching the employee_task table (e.g., name, company, location, task, hours, date, status, bill_number, charges, etc.)
 */
exports.postdata = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ Message: "No data provided" });
    }
    
    // Standardize payload keys and calculate amount automatically
    const standardized = {
      Employee: payload.Employee || payload.employee || payload.name || "",
      Company: payload.Company || payload.company || "",
      Date: payload.Date || payload.date || "",
      Vehicle: payload.Vehicle || payload.vehicle || payload.Title || payload.title || "", // Support both Vehicle and Title
      Details: payload.Details || payload.details || payload.task || "",
      Hours: parseFloat(payload.Hours || payload.hours || 0),
      Rate: parseFloat(payload.Rate || payload.rate || 0),
      Status: payload.Status || payload.status || "bill pending",
      Location: payload.Location || payload.location || ""
    };
    
    // Auto-calculate amount (Hours * Rate)
    standardized.Amount = standardized.Hours * standardized.Rate;
    
    // Auto-create customer if company is provided and doesn't exist
    if (standardized.Company) {
      const checkCustomerSql = "SELECT COUNT(*) as count FROM customers WHERE name = ?";
      db.get(checkCustomerSql, [standardized.Company], (err, row) => {
        if (!err && row && row.count === 0) {
          // Customer doesn't exist, create it
          const customerData = {
            name: standardized.Company,
            vehicle: "N/A",
            description: "Auto-created from employee task",
            date: standardized.Date,
            contact: "To be updated",
            amount: standardized.Amount,
            location: standardized.Location || "N/A"
          };
          
          const insertCustomerSql = `INSERT INTO customers (name, vehicle, description, date, contact, amount, location) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          db.run(insertCustomerSql, Object.values(customerData), (customerErr) => {
            if (customerErr) {
              console.error("Auto-customer creation error:", customerErr);
            } else {
              console.log(`✅ Auto-created customer: ${standardized.Company}`);
            }
          });
        }
      });
    }
    
    // Only keep keys with non-empty values (except Amount which can be 0)
    const keys = Object.keys(standardized).filter(k => 
      k === 'Amount' || standardized[k] !== "" && standardized[k] !== 0
    );
    
    if (keys.length === 0) {
      return res.status(400).json({ Message: "No valid columns provided" });
    }
    
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map(k => standardized[k]);
    const sql = `INSERT INTO employee_task (${keys.join(", ")}) VALUES (${placeholders})`;
    
    db.run(sql, values, function(err) {
      if (err) {
        console.error("postdata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
        // Auto-generate income entry if task is completed and has amount
        if ((standardized.Status === "bill done" || standardized.Status === "completed") && standardized.Amount > 0) {
          const incomeData = {
            source: standardized.Company || "Task Completion",
            description: `${standardized.Vehicle} - ${standardized.Employee}`,
            date: standardized.Date,
            amount: standardized.Amount,
            status: "pending",
            task_id: this.lastID
          };        const incomeKeys = Object.keys(incomeData).join(", ");
        const incomePlaceholders = Object.keys(incomeData).map(() => "?").join(", ");
        const incomeValues = Object.values(incomeData);
        const incomeSql = `INSERT INTO income (${incomeKeys}) VALUES (${incomePlaceholders})`;
        
        db.run(incomeSql, incomeValues, (incomeErr) => {
          if (incomeErr) {
            console.error("Auto-income creation error:", incomeErr);
          }
        });
      }
      
      res.status(201).json({ Message: "Created", id: this.lastID, amount: standardized.Amount });
    });
  } catch (e) {
    console.error("postdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * GET /employeetask/get/Etask
 * Optional query params: search, from, to (extend later as needed)
 */
exports.getdata = async (req, res) => {
  try {
    // Basic implementation: return all rows newest first
    const sql = "SELECT * FROM employee_task ORDER BY id DESC";
    db.all(sql, (err, rows) => {
      if (err) {
        console.error("getdata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      res.json(rows);
    });
  } catch (e) {
    console.error("getdata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * GET /employeetask/getexcel/:id
 * For now: return the row JSON. If you truly need an Excel file, we can hook up your exporter once we see its API.
 */
exports.getcusterexcel = async (req, res) => {
  try {
    const id = req.params.id;
    db.all("SELECT * FROM employee_task WHERE id = ?", [id], (err, rows) => {
      if (err) {
        console.error("getcusterexcel error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ Message: "Not found" });
      }
      res.json(rows[0]);
    });
  } catch (e) {
    console.error("getcusterexcel exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * PUT /employeetask/update/:id
 * Body: partial columns to update
 */
exports.updatedata = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    if (!id) return res.status(400).json({ Message: "Missing id" });
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ Message: "No data provided" });
    }

    // First get the current task data
    db.get("SELECT * FROM employee_task WHERE id = ?", [id], (err, currentTask) => {
      if (err) {
        console.error("updatedata get error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (!currentTask) {
        return res.status(404).json({ Message: "Task not found" });
      }

      const setClause = Object.keys(payload).map(key => `${key} = ?`).join(", ");
      const values = [...Object.values(payload), id];
      const sql = `UPDATE employee_task SET ${setClause} WHERE id = ?`;
      
      db.run(sql, values, function(err) {
        if (err) {
          console.error("updatedata error:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ Message: "Not found" });
        }
        
        // Check if status was changed to "completed" and auto-generate income
        if (payload.Status === "completed" && currentTask.Status !== "completed" && currentTask.Amount > 0) {
          const incomeData = {
            source: currentTask.Company || "Task Completion",
            description: `${currentTask.Title} - ${currentTask.Employee}`,
            date: currentTask.Date,
            amount: currentTask.Amount,
            status: "confirmed",
            task_id: id
          };
          
          const incomeKeys = Object.keys(incomeData).join(", ");
          const incomePlaceholders = Object.keys(incomeData).map(() => "?").join(", ");
          const incomeValues = Object.values(incomeData);
          const incomeSql = `INSERT INTO income (${incomeKeys}) VALUES (${incomePlaceholders})`;
          
          db.run(incomeSql, incomeValues, (incomeErr) => {
            if (incomeErr) {
              console.error("Auto-income creation error:", incomeErr);
            } else {
              console.log(`✅ Auto-created income entry for completed task ${id}: $${currentTask.Amount}`);
            }
          });
        }
        
        res.json({ Message: "Updated", automaticIncomeCreated: payload.Status === "completed" && currentTask.Status !== "completed" });
      });
    });
  } catch (e) {
    console.error("updatedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * DELETE /employeetask/delete/:id
 */
exports.deletedata = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ Message: "Missing id" });

    db.run("DELETE FROM employee_task WHERE id = ?", [id], function(err) {
      if (err) {
        console.error("deletedata error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ Message: "Task not found" });
      }
      console.log(`✅ Successfully deleted task with id: ${id}`);
      res.json({ Message: "Deleted", deletedRows: this.changes });
    });
  } catch (e) {
    console.error("deletedata exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * NEW: Group tasks by employee for accordion UI
 * GET /employeetask/grouped
 */
exports.groupedByEmployee = async (req, res) => {
  try {
    // Does `employees` table exist?
    const existsSql = `
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'employees'
    `;
    const existsRows = await new Promise((resolve, reject) => {
      connectDB.query(existsSql, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    const hasEmployees = existsRows && existsRows[0] && Number(existsRows[0].cnt) > 0;

    if (hasEmployees) {
      const sql = `
        SELECT e.id AS employeeId, e.name AS employeeName,
               t.id AS taskId, t.*
        FROM employees e
        LEFT JOIN employee_task t ON t.name = e.name
        ORDER BY e.name ASC, t.id DESC
      `;
      const rows = await new Promise((resolve, reject) => {
        connectDB.query(sql, (err, r) => (err ? reject(err) : resolve(r)));
      });

      const groups = {};
      for (const r of rows) {
        const key = r.employeeId || `name:${r.employeeName || ""}`;
        if (!groups[key]) {
          groups[key] = { employeeId: r.employeeId, name: r.employeeName, tasks: [] };
        }
        if (r.taskId) {
          // Keep original columns for compatibility
          const { taskId, employeeId, employeeName, ...rest } = r;
          groups[key].tasks.push({ id: taskId, ...rest });
        }
      }
      return res.json({ employees: Object.values(groups) });
    }

    // Fallback: group by free-text name from employee_task
    const allTasks = await new Promise((resolve, reject) => {
      connectDB.query("SELECT * FROM employee_task ORDER BY name ASC, id DESC", (err, r) =>
        err ? reject(err) : resolve(r)
      );
    });

    const groups = {};
    for (const t of allTasks) {
      const key = t.name || "Unknown";
      if (!groups[key]) groups[key] = { employeeId: null, name: key, tasks: [] };
      groups[key].tasks.push({ ...t });
    }
    return res.json({ employees: Object.values(groups) });
  } catch (e) {
    console.error("groupedByEmployee exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * NEW: Add a task after selecting an employee from dropdown
 * POST /employeetask/by-employee/:employeeId
 * Body: columns for employee_task; we overwrite/ensure `name` with the employee's name
 */
exports.postTaskByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ Message: "employeeId is required" });

    const empRows = await new Promise((resolve, reject) => {
      connectDB.query(
        "SELECT id, name FROM employees WHERE id = ?",
        [employeeId],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
    const emp = empRows && empRows[0];
    if (!emp) return res.status(404).json({ Message: "Employee not found" });

    const payload = { ...(req.body || {}), name: emp.name };

    await new Promise((resolve, reject) => {
      connectDB.query("INSERT INTO employee_task SET ?", payload, (err) =>
        err ? reject(err) : resolve()
      );
    });

    res.status(201).json({ Message: "Task created for employee", employeeId: emp.id, name: emp.name });
  } catch (e) {
    console.error("postTaskByEmployee exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * POST /employeetask/generate-invoice
 * Generate invoice from completed tasks for a company
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { company, startDate, endDate } = req.body;
    
    if (!company) {
      return res.status(400).json({ Message: "Company name is required" });
    }
    
    // Get completed tasks for the company within date range
    let query = "SELECT * FROM employee_task WHERE Company = ? AND Status = 'completed'";
    let params = [company];
    
    if (startDate && endDate) {
      query += " AND Date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    db.all(query, params, (err, tasks) => {
      if (err) {
        console.error("generateInvoice error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
      if (tasks.length === 0) {
        return res.status(404).json({ Message: "No completed tasks found for this company" });
      }
      
      // Calculate totals
      const totalHours = tasks.reduce((sum, task) => sum + (task.Hours || 0), 0);
      const totalAmount = tasks.reduce((sum, task) => sum + (task.Amount || 0), 0);
      const description = `Services for ${tasks.length} completed tasks`;
      
      // Create invoice
      const invoiceData = {
        company: company,
        description: description,
        hours: totalHours,
        rate: totalAmount / totalHours || 0,
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        advance: 0,
        pending: totalAmount
      };
      
      const invoiceKeys = Object.keys(invoiceData).join(", ");
      const invoicePlaceholders = Object.keys(invoiceData).map(() => "?").join(", ");
      const invoiceValues = Object.values(invoiceData);
      const invoiceSql = `INSERT INTO invoice (${invoiceKeys}) VALUES (${invoicePlaceholders})`;
      
      db.run(invoiceSql, invoiceValues, function(invoiceErr) {
        if (invoiceErr) {
          console.error("Invoice creation error:", invoiceErr);
          return res.status(500).json({ Message: "Failed to create invoice" });
        }
        
        const invoiceId = this.lastID;
        
        // Update tasks with invoice_id
        const updateTaskSql = "UPDATE employee_task SET invoice_id = ? WHERE id IN (" + 
                             tasks.map(() => "?").join(",") + ")";
        const updateParams = [invoiceId, ...tasks.map(t => t.id)];
        
        db.run(updateTaskSql, updateParams, (updateErr) => {
          if (updateErr) {
            console.error("Task update error:", updateErr);
          }
        });
        
        // Create income entry
        const incomeData = {
          source: company,
          description: `Invoice #${invoiceId} - ${description}`,
          date: invoiceData.date,
          amount: totalAmount,
          status: 'pending',
          invoice_id: invoiceId
        };
        
        const incomeKeys = Object.keys(incomeData).join(", ");
        const incomePlaceholders = Object.keys(incomeData).map(() => "?").join(", ");
        const incomeValues = Object.values(incomeData);
        const incomeSql = `INSERT INTO income (${incomeKeys}) VALUES (${incomePlaceholders})`;
        
        db.run(incomeSql, incomeValues, (incomeErr) => {
          if (incomeErr) {
            console.error("Income creation error:", incomeErr);
          }
        });
        
        res.status(201).json({ 
          Message: "Invoice generated successfully", 
          invoiceId: invoiceId,
          totalAmount: totalAmount,
          totalHours: totalHours,
          tasksIncluded: tasks.length
        });
      });
    });
  } catch (e) {
    console.error("generateInvoice exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};
