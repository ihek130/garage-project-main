import React, { useEffect, useMemo, useState } from "react";
import Layout from "../Layout";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Vehicle options (from Vehicle.jsx)
const vehicleOptions = [
  "",
  "Crane: 25-Ton",
  "Crane: 50-Ton", 
  "Crane: 70-Ton",
  "Crane: 100-Ton",
  "Forklift: 3-Ton",
  "Forklift: 5-Ton",
  "Forklift: 7-Ton",
  "Forklift: 10-Ton",
  "Boomloader: 523",
  "Boomloader: 540",
];

// Status options (with bill prefix)
const statusOptions = [
  "bill pending",
  "bill in-progress", 
  "bill done",
];

// Function to get display name for status (adds bill prefix)
const getStatusDisplayName = (status) => {
  const statusMap = {
    'pending': 'bill pending',
    'in-progress': 'bill in-progress', 
    'done': 'bill done',
    'completed': 'bill done'
  };
  return statusMap[status] || `bill ${status}`;
};

// Function to get database value for status (removes bill prefix)
const getStatusDbValue = (displayStatus) => {
  const statusMap = {
    'bill pending': 'pending',
    'bill in-progress': 'in-progress',
    'bill done': 'done'
  };
  return statusMap[displayStatus] || displayStatus.replace('bill ', '');
};

// ---- Endpoint fallbacks (since your controllers use varied names) ----
const EMPLOYEE_LIST = [
  "/employee/get/employees",
  "/employee/get/Employee",
  "/employee/get",
  "/employee",
];
const EMPLOYEE_CREATE = [
  "/employee/post/employee",
  "/employee/create",
  "/employee", // POST
];

const TASK_LIST = [
  "/employeetask/get/E-employeetask",
  "/employeetask/get/Employeetask",
  "/employeetask/get",
  "/employeetask",
];

  // Always use the correct backend endpoint for creating tasks
  const TASK_CREATE = ["/employeetask/post/Etask"];

async function tryFetchJSON(urls, options) {
  for (const p of urls) {
    try {
      const res = await fetch(`${API_BASE}${p}`, options);
      if (!res.ok) continue;
      return await res.json();
    } catch (_) {}
  }
  return null;
}

export default function Employeetask() {
  // employees & tasks
  const [employees, setEmployees] = useState([]); // {id?, name?}
  const [tasks, setTasks] = useState([]); // raw rows from backend
  const [customers, setCustomers] = useState([]); // customer list from /customer/get/E-customer

  // UI state
  const [search, setSearch] = useState("");
  const [openEmp, setOpenEmp] = useState(null); // employee name currently expanded
  const [showConsolidatedView, setShowConsolidatedView] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
    singleDate: ""
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // compose task
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

  const [taskForm, setTaskForm] = useState({
    vehicle: "",
    details: "",
    company: "",
    hours: "",
    rate: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "pending", // Store database value, display will show "bill pending"
  });
  const [savingTask, setSavingTask] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({});

  // infer schema keys from the first task row we get (so we POST with the same column names)
  const schema = useMemo(() => {
    const row = tasks && tasks.length ? tasks[0] : {};
    const keys = Object.keys(row || {}).reduce((acc, k) => {
      acc[k.toLowerCase()] = k;
      return acc;
    }, {});

    const nameKey =
      keys["employee"] ||
      keys["emp_name"] ||
      keys["employeename"] ||
      keys["employee_name"] ||
      keys["name"] ||
      "name";

    const taskKey =
      keys["task"] || keys["work"] || keys["job"] || keys["description"] || "task";

    const dateKey = keys["date"] || keys["createdat"] || "date";
    const statusKey = keys["status"] || "status";
    const amountKey = keys["amount"] || keys["cost"] || "amount";
    const idKey = keys["id"] || "id";

    return { nameKey, taskKey, dateKey, statusKey, amountKey, idKey };
  }, [tasks]);

  // fetch employees
  async function loadEmployees() {
    const j = await tryFetchJSON(EMPLOYEE_LIST);
    const rows = Array.isArray(j) ? j : Array.isArray(j?.rows) ? j.rows : [];
    // normalize: look for "name"ish field
    const norm = rows.map((r) => {
      const name =
        r.name ||
        r.Name ||
        r.employee ||
        r.employee_name ||
        r.fullname ||
        r.full_name ||
        r.title ||
        "";
      return { ...r, __name: String(name).trim() };
    }).filter((r) => r.__name);
    // dedupe by name
    const map = new Map();
    for (const r of norm) if (!map.has(r.__name)) map.set(r.__name, r);
    setEmployees(Array.from(map.values()));
  }

  // fetch customers
  async function loadCustomers() {
    try {
      const response = await fetch(`${API_BASE}/customer/get/E-customer`);
      const data = await response.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      setCustomers(rows);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    }
  }

  // fetch tasks
  async function loadTasks() {
    const j = await tryFetchJSON(TASK_LIST);
    const rows = Array.isArray(j) ? j : Array.isArray(j?.rows) ? j.rows : [];
    setTasks(rows);
  }

  useEffect(() => {
    loadEmployees();
    loadTasks();
    loadCustomers();
    // eslint-disable-next-line
  }, []);

  // Advanced search filter with date, status, vehicle, and employee filters
  const advancedFilteredTasks = useMemo(() => {
    let filtered = tasks;

    // Text search filter
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((t) => {
        const searchableFields = [
          t[schema.nameKey],
          t.Company || t.company,
          t.Vehicle || t.vehicle || t.Title || t.title,
          t.Details || t.details,
          t.Status || t.status,
          t.Location || t.location
        ];
        return searchableFields.some(field => 
          String(field || "").toLowerCase().includes(q)
        );
      });
    }

    // Date filter
    if (dateFilter.singleDate) {
      filtered = filtered.filter(t => {
        const taskDate = t.Date || t.date || "";
        return taskDate === dateFilter.singleDate;
      });
    } else if (dateFilter.startDate || dateFilter.endDate) {
      filtered = filtered.filter(t => {
        const taskDate = t.Date || t.date || "";
        if (!taskDate) return false;
        
        const isAfterStart = !dateFilter.startDate || taskDate >= dateFilter.startDate;
        const isBeforeEnd = !dateFilter.endDate || taskDate <= dateFilter.endDate;
        return isAfterStart && isBeforeEnd;
      });
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(t => {
        const status = t.Status || t.status || "";
        return status.toLowerCase().includes(statusFilter.toLowerCase());
      });
    }

    // Vehicle filter
    if (vehicleFilter) {
      filtered = filtered.filter(t => {
        const vehicle = t.Vehicle || t.vehicle || t.Title || t.title || "";
        return vehicle.toLowerCase().includes(vehicleFilter.toLowerCase());
      });
    }

    // Employee filter
    if (employeeFilter) {
      filtered = filtered.filter(t => {
        const employee = t[schema.nameKey] || "";
        return employee.toLowerCase().includes(employeeFilter.toLowerCase());
      });
    }

    // Company filter
    if (companyFilter) {
      filtered = filtered.filter(t => {
        const company = t.Company || t.company || "";
        return company.toLowerCase().includes(companyFilter.toLowerCase());
      });
    }

    return filtered;
  }, [tasks, search, dateFilter, statusFilter, vehicleFilter, employeeFilter, companyFilter, schema]);

  // search filter (by employee name or task text) - for backward compatibility
  const filteredBySearch = useMemo(() => {
    return showConsolidatedView ? advancedFilteredTasks : advancedFilteredTasks;
  }, [advancedFilteredTasks, showConsolidatedView]);

  // group by employee name (use schema.nameKey)
  const grouped = useMemo(() => {
    const m = new Map();
    for (const t of filteredBySearch) {
      const name = String(t[schema.nameKey] ?? "").trim();
      const key = name || "(Unassigned)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    }
    return m;
  }, [filteredBySearch, schema.nameKey]);

  // Consolidated view calculations
  const consolidatedStats = useMemo(() => {
    const stats = {
      totalTasks: advancedFilteredTasks.length,
      totalAmount: 0,
      totalHours: 0,
      statusBreakdown: {},
      vehicleBreakdown: {},
      employeeBreakdown: {},
      companyBreakdown: {}
    };

    advancedFilteredTasks.forEach(task => {
      // Amount calculation
      const amount = parseFloat(task.Amount || task.amount || 0);
      stats.totalAmount += amount;

      // Hours calculation
      const hours = parseFloat(task.Hours || task.hours || 0);
      stats.totalHours += hours;

      // Status breakdown (consolidate to 3 simple categories)
      const status = task.Status || task.status || "unknown";
      let simpleStatus = "";
      
      // Map all status variations to 3 simple categories
      if (status.includes("pending") || status === "pending") {
        simpleStatus = "bill pending";
      } else if (status.includes("progress") || status === "in-progress") {
        simpleStatus = "bill in-progress";
      } else if (status.includes("done") || status === "done" || status === "completed") {
        simpleStatus = "bill done";
      } else {
        simpleStatus = "bill pending"; // default for unknown statuses
      }
      
      stats.statusBreakdown[simpleStatus] = (stats.statusBreakdown[simpleStatus] || 0) + 1;

      // Vehicle breakdown
      const vehicle = task.Vehicle || task.vehicle || task.Title || task.title || "N/A";
      stats.vehicleBreakdown[vehicle] = (stats.vehicleBreakdown[vehicle] || 0) + 1;

      // Employee breakdown
      const employee = task[schema.nameKey] || "Unassigned";
      stats.employeeBreakdown[employee] = (stats.employeeBreakdown[employee] || 0) + 1;

      // Company breakdown
      const company = task.Company || task.company || "N/A";
      stats.companyBreakdown[company] = (stats.companyBreakdown[company] || 0) + 1;
    });

    return stats;
  }, [advancedFilteredTasks, schema.nameKey]);

  // employees used for dropdown (sorted, only names)
  const employeeNames = useMemo(() => {
    const names = new Set();
    for (const e of employees) names.add(e.__name);
    // also add names seen in tasks (in case not present in employee table yet)
    for (const [n] of grouped) names.add(n);
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees, grouped]);

  async function createEmployee() {
    const name = newEmployeeName.trim();
    if (!name) return alert("Enter a name.");
    try {
      setSavingEmployee(true);
      // first endpoint that accepts it
      let ok = false;
      for (const p of EMPLOYEE_CREATE) {
        try {
          const res = await fetch(`${API_BASE}${p}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          if (res.ok || res.status === 201) {
            ok = true;
            break;
          }
        } catch (_) {}
      }
      if (!ok) {
        alert("Could not create employee (no working endpoint). We can wire this next.");
      } else {
        await loadEmployees();
        setSelectedEmployee(name);
        setShowNewEmployee(false);
        setNewEmployeeName("");
      }
    } finally {
      setSavingEmployee(false);
    }
  }

  async function createCustomer() {
    const name = newCustomerName.trim();
    if (!name) return alert("Enter a customer name.");
    try {
      const response = await fetch(`${API_BASE}/customer/post/E-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          vehicle: "N/A",
          description: "Manually added customer",
          date: new Date().toISOString().slice(0, 10),
          contact: "To be updated",
          amount: 0,
          location: "N/A"
        }),
      });
      
      if (response.ok || response.status === 201) {
        await loadCustomers();
        setTaskForm(p => ({ ...p, company: name }));
        setShowNewCustomer(false);
        setNewCustomerName("");
      } else {
        alert("Could not create customer. Please try again.");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Error creating customer. Please try again.");
    }
  }

  async function createTask(e) {
    e.preventDefault();
    if (!selectedEmployee) return alert("Select an employee.");
    // Calculate amount automatically when hours or rate changes
    const calculatedAmount = (parseFloat(taskForm.hours) || 0) * (parseFloat(taskForm.rate) || 0);
    
    // Standardize payload keys to match backend
    const payload = {
      Employee: selectedEmployee,
      Company: taskForm.company,
      Date: taskForm.date,
      Vehicle: taskForm.vehicle, // Changed from Title to Vehicle
      Details: taskForm.details,
      Hours: parseFloat(taskForm.hours) || 0,
      Rate: parseFloat(taskForm.rate) || 0,
      Amount: calculatedAmount,
      Status: taskForm.status,
      Location: taskForm.location || ""
    };

    try {
      setSavingTask(true);
      let ok = false;
      for (const p of TASK_CREATE) {
        try {
          const res = await fetch(`${API_BASE}${p}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok || res.status === 201) {
            ok = true;
            break;
          }
        } catch (_) {}
      }
      if (!ok) {
        alert(
          "Could not create task (no working endpoint accepted the payload). We can quickly align the controller if you share its current column names."
        );
      } else {
        setComposeOpen(false);
        setTaskForm({
          vehicle: "",
          details: "",
          company: "",
          hours: "",
          rate: "",
          amount: "",
          date: new Date().toISOString().slice(0, 10),
          status: "pending",
        });
        await loadTasks();
        setOpenEmp(selectedEmployee); // open the employee we just added to
      }
    } finally {
      setSavingTask(false);
    }
  }

  async function generateInvoice() {
    if (!taskForm.company) {
      alert('Please select a company first')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/employeetask/generate-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company: taskForm.company
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Invoice generated successfully! Total: $${data.total}, Invoice ID: ${data.invoiceId}`)
        await loadTasks() // Refresh tasks to show completed status
      } else {
        alert(data.message || 'Failed to generate invoice')
      }
    } catch (error) {
      console.error('Error generating invoice:', error)
      alert('Error generating invoice')
    }
  }

  function startEdit(task) {
    setEditingTask(task[schema.idKey]);
    setEditForm({
      vehicle: task.Vehicle || task.vehicle || task.Title || task.title || "", // Support both old Title and new Vehicle
      details: task.Details || task.details || "",
      company: task.Company || task.company || "",
      hours: task.Hours || task.hours || "",
      rate: task.Rate || task.rate || "",
      status: task.Status || task.status || "pending" // Keep original database value
    });
  }

  async function deleteTask(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const response = await fetch(`${API_BASE}/employeetask/delete/${taskId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        await loadTasks();
      } else {
        alert("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Error deleting task");
    }
  }

  async function deleteEmployee(employeeName) {
    if (!window.confirm(`Are you sure you want to delete employee "${employeeName}" and ALL their tasks? This cannot be undone.`)) return;
    
    try {
      // Get all tasks for this employee
      const tasksForEmployee = tasks.filter(task => 
        (task[schema.nameKey] || "").trim() === employeeName
      );
      
      if (tasksForEmployee.length === 0) {
        alert(`No tasks found for employee "${employeeName}". They may already be deleted.`);
        return;
      }
      
      // Delete each task
      let deletedTasks = 0;
      for (const task of tasksForEmployee) {
        try {
          const response = await fetch(`${API_BASE}/employeetask/delete/${task[schema.idKey]}`, {
            method: "DELETE"
          });
          if (response.ok) {
            deletedTasks++;
          }
        } catch (error) {
          console.error(`Error deleting task ${task[schema.idKey]}:`, error);
        }
      }
      
      // Close accordion immediately if it was open
      if (openEmp === employeeName) {
        setOpenEmp(null);
      }
      
      // Remove tasks from local state immediately for instant UI update
      setTasks(prevTasks => prevTasks.filter(task => 
        (task[schema.nameKey] || "").trim() !== employeeName
      ));
      
      // Also reload from server to ensure consistency
      setTimeout(() => {
        loadTasks();
        loadEmployees();
      }, 100);
      
      alert(`Successfully deleted employee "${employeeName}" and ${deletedTasks} associated tasks.`);
      
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Error deleting employee. Please refresh and try again.");
    }
  }

  function cancelEdit() {
    setEditingTask(null);
    setEditForm({});
  }

  async function saveEdit(taskId) {
    try {
      const calculatedAmount = (parseFloat(editForm.hours) || 0) * (parseFloat(editForm.rate) || 0);
      
      const payload = {
        Title: editForm.title,
        Details: editForm.details,
        Company: editForm.company,
        Hours: parseFloat(editForm.hours) || 0,
        Rate: parseFloat(editForm.rate) || 0,
        Amount: calculatedAmount,
        Status: editForm.status
      };

      const res = await fetch(`${API_BASE}/employeetask/update/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Task updated successfully!");
        setEditingTask(null);
        setEditForm({});
        await loadTasks();
      } else {
        alert("Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Error updating task");
    }
  }

  async function markComplete(taskId) {
    try {
      const res = await fetch(`${API_BASE}/employeetask/update/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Status: "completed" }),
      });

      if (res.ok) {
        alert("Task marked as completed! Income entry auto-created.");
        await loadTasks();
      } else {
        alert("Failed to update task");
      }
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Error completing task");
    }
  }

  return (
    <Layout title="Employee Task">
      {/* Task controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search employee/tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-3 py-2 border rounded shadow-sm text-sm"
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConsolidatedView(!showConsolidatedView)}
          >
            {showConsolidatedView ? "👥 Group View" : "📊 Smart View"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setComposeOpen((v) => !v)}
          >
            {composeOpen ? "Close" : "New Task"}
          </button>
        </div>
      </div>

      {/* Smart Search Filters */}
      {showConsolidatedView && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Smart Search & Analytics</h3>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            {/* Date Filters */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">Single Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm w-full"
                value={dateFilter.singleDate}
                onChange={(e) => setDateFilter(prev => ({ 
                  ...prev, 
                  singleDate: e.target.value,
                  startDate: e.target.value ? "" : prev.startDate,
                  endDate: e.target.value ? "" : prev.endDate
                }))}
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-600 block mb-1">Date From</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm w-full"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ 
                  ...prev, 
                  startDate: e.target.value,
                  singleDate: e.target.value ? "" : prev.singleDate
                }))}
                disabled={!!dateFilter.singleDate}
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-600 block mb-1">Date To</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm w-full"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ 
                  ...prev, 
                  endDate: e.target.value,
                  singleDate: e.target.value ? "" : prev.singleDate
                }))}
                disabled={!!dateFilter.singleDate}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">Status</label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Filter */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">Vehicle</label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
              >
                <option value="">All Vehicles</option>
                {vehicleOptions.filter(v => v).map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="text-xs text-gray-600 block mb-1">Company</label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="">All Companies</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.name}>{customer.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm"
              onClick={() => {
                setDateFilter({ startDate: "", endDate: "", singleDate: "" });
                setStatusFilter("");
                setVehicleFilter("");
                setEmployeeFilter("");
                setCompanyFilter("");
                setSearch("");
              }}
            >
              Clear All Filters
            </button>
          </div>

          {/* Consolidated Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 text-sm font-medium">Total Tasks</div>
              <div className="text-2xl font-bold text-blue-800">{consolidatedStats.totalTasks}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 text-sm font-medium">Total Amount</div>
              <div className="text-2xl font-bold text-green-800">AED {consolidatedStats.totalAmount.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-purple-600 text-sm font-medium">Total Hours</div>
              <div className="text-2xl font-bold text-purple-800">{consolidatedStats.totalHours.toFixed(1)}h</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-yellow-600 text-sm font-medium">Avg Rate</div>
              <div className="text-2xl font-bold text-yellow-800">
                AED {consolidatedStats.totalHours > 0 ? (consolidatedStats.totalAmount / consolidatedStats.totalHours).toFixed(0) : 0}/h
              </div>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Breakdown */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-gray-800 mb-2">Status Breakdown</h4>
              {Object.entries(consolidatedStats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{getStatusDisplayName(status)}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>

            {/* Vehicle Breakdown */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-gray-800 mb-2">Vehicle Breakdown</h4>
              {Object.entries(consolidatedStats.vehicleBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([vehicle, count]) => (
                <div key={vehicle} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600 truncate">{vehicle || "N/A"}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>

            {/* Employee Breakdown */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-gray-800 mb-2">Top Employees</h4>
              {Object.entries(consolidatedStats.employeeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([employee, count]) => (
                <div key={employee} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600 truncate">{employee}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>

            {/* Company Breakdown */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-gray-800 mb-2">
                {companyFilter ? `${companyFilter} Tasks & Employees` : 'Top Companies'}
              </h4>
              {companyFilter ? (
                // Show detailed company analytics when company filter is selected
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Showing {advancedFilteredTasks.length} tasks for {companyFilter}
                  </div>
                  {Object.entries(consolidatedStats.employeeBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([employee, count]) => (
                    <div key={employee} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{employee}</span>
                        <div className="text-xs text-gray-500">
                          {advancedFilteredTasks.filter(t => (t[schema.nameKey] || "") === employee)
                            .reduce((sum, t) => sum + (parseFloat(t.Hours || t.hours || 0)), 0).toFixed(1)}h, 
                          AED {advancedFilteredTasks.filter(t => (t[schema.nameKey] || "") === employee)
                            .reduce((sum, t) => sum + (parseFloat(t.Amount || t.amount || 0)), 0).toFixed(0)}
                        </div>
                      </div>
                      <span className="text-sm font-medium">{count} tasks</span>
                    </div>
                  ))}
                </div>
              ) : (
                // Show top companies overview when no company filter is selected
                Object.entries(consolidatedStats.companyBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([company, count]) => (
                  <div key={company} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600 truncate">{company || "N/A"}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

        {/* Composer */}
        {composeOpen && (
          <div className="px-6 pt-4">
            <form
              onSubmit={createTask}
              className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
            >
              {/* Employee dropdown */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Employee</label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={selectedEmployee}
                  onChange={(e) => {
                    if (e.target.value === "__ADD_NEW__") {
                      setShowNewEmployee(true);
                      setSelectedEmployee("");
                    } else {
                      setShowNewEmployee(false);
                      setSelectedEmployee(e.target.value);
                    }
                  }}
                >
                  <option value="">— Select employee —</option>
                  {(employeeNames || []).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="__ADD_NEW__">➕ Add new employee…</option>
                </select>
              </div>

              {showNewEmployee && (
                <div className="md:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">New employee name</label>
                    <input
                      className="border rounded px-3 py-2 text-sm w-full"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="e.g., Ali Raza"
                    />
                  </div>
                  <button
                    type="button"
                    className="border px-3 py-2 rounded text-sm"
                    onClick={createEmployee}
                    disabled={savingEmployee}
                  >
                    {savingEmployee ? "Saving..." : "Save"}
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-600 block mb-1">Date</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Customer/Company</label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.company}
                  onChange={(e) => {
                    if (e.target.value === "__ADD_NEW__") {
                      setShowNewCustomer(true);
                      setTaskForm((p) => ({ ...p, company: "" }));
                    } else {
                      setShowNewCustomer(false);
                      setTaskForm((p) => ({ ...p, company: e.target.value }));
                    }
                  }}
                >
                  <option value="">— Select customer/company —</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name}
                    </option>
                  ))}
                  <option value="__ADD_NEW__">➕ Add new customer…</option>
                </select>
              </div>

              {showNewCustomer && (
                <div className="md:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">New customer name</label>
                    <input
                      className="border rounded px-3 py-2 text-sm w-full"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="e.g., ABC Corporation"
                    />
                  </div>
                  <button
                    type="button"
                    className="border px-3 py-2 rounded text-sm bg-blue-600 text-white"
                    onClick={createCustomer}
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Vehicle</label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.vehicle}
                  onChange={(e) => setTaskForm((p) => ({ ...p, vehicle: e.target.value }))}
                >
                  {vehicleOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option || "— Select vehicle —"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.hours}
                  onChange={(e) => setTaskForm((p) => ({ ...p, hours: e.target.value }))}
                  placeholder="Hours worked"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Rate (per hour)</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.rate}
                  onChange={(e) => setTaskForm((p) => ({ ...p, rate: e.target.value }))}
                  placeholder="Hourly rate"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Amount (auto-calculated)</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm w-full bg-gray-100"
                  value={((parseFloat(taskForm.hours) || 0) * (parseFloat(taskForm.rate) || 0)).toFixed(2)}
                  readOnly
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Amount (auto-calculated)</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm w-full bg-gray-100"
                  value={((parseFloat(taskForm.hours) || 0) * (parseFloat(taskForm.rate) || 0)).toFixed(2)}
                  readOnly
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-gray-600 block mb-1">Details</label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.details}
                  onChange={(e) => setTaskForm((p) => ({ ...p, details: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Status</label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.status}
                  onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="pending">bill pending</option>
                  <option value="in-progress">bill in-progress</option>
                  <option value="done">bill done</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Amount (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.amount}
                  onChange={(e) => setTaskForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>

              <div className="md:col-span-6 flex gap-3">
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  onClick={generateInvoice}
                  disabled={!taskForm.company}
                >
                  Generate Invoice for Company
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingTask}
                >
                  {savingTask ? "Saving..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Consolidated Table View */}
        {showConsolidatedView ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  📋 All Tasks ({advancedFilteredTasks.length} results)
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {advancedFilteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                          {tasks.length === 0 ? "No tasks found" : "No tasks match current filters"}
                        </td>
                      </tr>
                    ) : (
                      advancedFilteredTasks
                        .sort((a, b) => new Date(b.Date || b.date || 0) - new Date(a.Date || a.date || 0))
                        .map((task, idx) => {
                          const isEditing = editingTask === task[schema.idKey];
                          return (
                            <tr key={task[schema.idKey] || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-3 text-sm text-gray-900">{task[schema.idKey] || idx + 1}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{task.Date || task.date || "N/A"}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{task[schema.nameKey] || "N/A"}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{task.Vehicle || task.vehicle || task.Title || task.title || "N/A"}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{task.Company || task.company || "N/A"}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{task.Hours || task.hours || 0}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">AED {task.Rate || task.rate || 0}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">AED {task.Amount || task.amount || 0}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  (task.Status || task.status || "").includes("done") 
                                    ? "bg-green-100 text-green-800"
                                    : (task.Status || task.status || "").includes("progress")
                                    ? "bg-yellow-100 text-yellow-800" 
                                    : "bg-blue-100 text-blue-800"
                                }`}>
                                  {task.Status || task.status || "pending"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEdit(task)}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Edit"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => deleteTask(task[schema.idKey])}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                    title="Delete"
                                  >
                                    🗑️ Del
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Grouped by employee accordions */
          <div className="p-6 space-y-3">
            {[...grouped.keys()]
              .filter((n) => n && n !== "(Unassigned)")
              .sort((a, b) => a.localeCompare(b))
              .map((name) => {
              const isOpen = openEmp === name;
              const list = grouped.get(name) || [];
              return (
                <div className="bg-white rounded-lg shadow" key={name}>
                  <div className="flex">
                    <button
                      onClick={() => setOpenEmp((p) => (p === name ? null : name))}
                      className={`flex-1 flex justify-between items-center px-4 py-3 text-left ${
                        isOpen ? "border-b" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#3d3d3d]">{name}</span>
                        <span className="text-xs text-gray-500">{list.length} task(s)</span>
                      </div>
                      <span className="text-sm">{isOpen ? "▲" : "▼"}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEmployee(name);
                      }}
                      className="px-3 py-3 text-red-600 hover:bg-red-50 text-sm font-medium border-l"
                      title={`Delete ${name} and all their tasks`}
                    >
                      🗑️
                    </button>
                  </div>

                  {isOpen && (
                    <div className="p-4 overflow-x-auto">
                      <table className="min-w-full bg-white rounded overflow-hidden">
                        <thead>
                          <tr className="bg-gray-100 text-[#3d3d3d]">
                            <th className="py-2 px-3 text-left text-xs">#</th>
                            <th className="py-2 px-3 text-left text-xs">Date</th>
                            <th className="py-2 px-3 text-left text-xs">Task</th>
                            <th className="py-2 px-3 text-left text-xs">Company</th>
                            <th className="py-2 px-3 text-left text-xs">Hours</th>
                            <th className="py-2 px-3 text-left text-xs">Rate</th>
                            <th className="py-2 px-3 text-left text-xs">Amount</th>
                            <th className="py-2 px-3 text-left text-xs">Status</th>
                            <th className="py-2 px-3 text-left text-xs">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(list || []).map((t) => {
                            const taskId = t[schema.idKey];
                            const isEditing = editingTask === taskId;
                            
                            if (isEditing) {
                              return (
                                <tr key={taskId} className="border-t bg-blue-50">
                                  <td className="py-2 px-3 text-sm">{taskId}</td>
                                  <td className="py-2 px-3 text-sm">
                                    {t[schema.dateKey] ? new Date(t[schema.dateKey]).toLocaleDateString() : ""}
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <input
                                      type="text"
                                      value={editForm.title}
                                      onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                      placeholder="Task title"
                                    />
                                    <textarea
                                      value={editForm.details}
                                      onChange={(e) => setEditForm(prev => ({...prev, details: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs mt-1"
                                      placeholder="Details"
                                      rows="2"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <input
                                      type="text"
                                      value={editForm.company}
                                      onChange={(e) => setEditForm(prev => ({...prev, company: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                      placeholder="Company"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <input
                                      type="number"
                                      value={editForm.hours}
                                      onChange={(e) => setEditForm(prev => ({...prev, hours: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                      placeholder="Hours"
                                      step="0.5"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <input
                                      type="number"
                                      value={editForm.rate}
                                      onChange={(e) => setEditForm(prev => ({...prev, rate: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                      placeholder="Rate"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-sm font-bold">
                                    ${((parseFloat(editForm.hours) || 0) * (parseFloat(editForm.rate) || 0)).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <select
                                      value={editForm.status}
                                      onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in-progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-sm">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => saveEdit(taskId)}
                                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            
                            return (
                              <tr key={taskId} className="border-t hover:bg-gray-50">
                                <td className="py-2 px-3 text-sm">{taskId}</td>
                                <td className="py-2 px-3 text-sm">
                                  {t[schema.dateKey] ? new Date(t[schema.dateKey]).toLocaleDateString() : ""}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  <div className="font-medium">{t.Title || t.title || "(no title)"}</div>
                                  <div className="text-xs text-gray-600">{t.Details || t.details || ""}</div>
                                </td>
                                <td className="py-2 px-3 text-sm">{t.Company || t.company || ""}</td>
                                <td className="py-2 px-3 text-sm">{t.Hours || t.hours || ""}</td>
                                <td className="py-2 px-3 text-sm">${t.Rate || t.rate || ""}</td>
                                <td className="py-2 px-3 text-sm font-bold">${t.Amount || t.amount || ""}</td>
                                <td className="py-2 px-3 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    (t.Status || t.status) === 'completed' ? 'bg-green-100 text-green-800' :
                                    (t.Status || t.status) === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {t.Status || t.status || "pending"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => startEdit(t)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                    >
                                      Edit
                                    </button>
                                    {(t.Status || t.status) !== 'completed' && (
                                      <button
                                        onClick={() => markComplete(taskId)}
                                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                      >
                                        Complete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {list.length === 0 && (
                            <tr>
                              <td
                                colSpan="9"
                                className="py-6 text-center text-sm text-gray-500"
                              >
                                No tasks for this employee.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Unassigned bucket (if any) */}
          {grouped.has("(Unassigned)") && (
            <div className="bg-white rounded-lg shadow">
              <button
                onClick={() =>
                  setOpenEmp((p) => (p === "(Unassigned)" ? null : "(Unassigned)"))
                }
                className={`w-full flex justify-between items-center px-4 py-3 text-left ${
                  openEmp === "(Unassigned)" ? "border-b" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#3d3d3d]">(Unassigned)</span>
                  <span className="text-xs text-gray-500">
                    {(grouped.get("(Unassigned)") || []).length} task(s)
                  </span>
                </div>
                <span className="text-sm">
                  {openEmp === "(Unassigned)" ? "▲" : "▼"}
                </span>
              </button>

              {openEmp === "(Unassigned)" && (
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full bg-white rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100 text-[#3d3d3d]">
                        <th className="py-2 px-3 text-left text-xs">#</th>
                        <th className="py-2 px-3 text-left text-xs">Date</th>
                        <th className="py-2 px-3 text-left text-xs">Task</th>
                        <th className="py-2 px-3 text-left text-xs">Status</th>
                        <th className="py-2 px-3 text-left text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grouped && grouped.get("(Unassigned)") ? grouped.get("(Unassigned)") : []).map((t, i) => (
                        <tr key={`${i}-un`} className="border-t">
                          <td className="py-2 px-3 text-sm">{t[schema.idKey]}</td>
                          <td className="py-2 px-3 text-sm">
                            {t[schema.dateKey]
                              ? new Date(t[schema.dateKey]).toLocaleDateString()
                              : ""}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {t[schema.taskKey] || t.details || "(no title)"}
                          </td>
                          <td className="py-2 px-3 text-sm">{t[schema.statusKey] || ""}</td>
                          <td className="py-2 px-3 text-sm">{t[schema.amountKey] ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        )}
    </Layout>
  );
}
