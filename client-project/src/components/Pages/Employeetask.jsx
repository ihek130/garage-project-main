import React, { useEffect, useMemo, useState } from "react";
import Layout from "../Layout";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

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

  // UI state
  const [search, setSearch] = useState("");
  const [openEmp, setOpenEmp] = useState(null); // employee name currently expanded

  // compose task
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    details: "",
    company: "",
    hours: "",
    rate: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "pending",
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

  // fetch tasks
  async function loadTasks() {
    const j = await tryFetchJSON(TASK_LIST);
    const rows = Array.isArray(j) ? j : Array.isArray(j?.rows) ? j.rows : [];
    setTasks(rows);
  }

  useEffect(() => {
    loadEmployees();
    loadTasks();
    // eslint-disable-next-line
  }, []);

  // search filter (by employee name or task text)
  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const parts = Object.values(t ?? {})
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [tasks, search]);

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
      Title: taskForm.title,
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
          title: "",
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
      title: task.Title || task.title || "",
      details: task.Details || task.details || "",
      company: task.Company || task.company || "",
      hours: task.Hours || task.hours || "",
      rate: task.Rate || task.rate || "",
      status: task.Status || task.status || "pending"
    });
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
            className="btn btn-primary btn-sm"
            onClick={() => setComposeOpen((v) => !v)}
          >
            {composeOpen ? "Close" : "New Task"}
          </button>
        </div>
      </div>

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
                <label className="text-xs text-gray-600 block mb-1">Company</label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.company}
                  onChange={(e) => setTaskForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Company name (e.g., ABC Corp)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Title</label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Short summary (e.g., Gearbox repair)"
                />
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
                  <option value="pending">pending</option>
                  <option value="in-progress">in-progress</option>
                  <option value="done">done</option>
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

        {/* Grouped by employee accordions */}
        <div className="p-6 space-y-3">
          {[...grouped.keys()]
            .filter((n) => n && n !== "(Unassigned)")
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
              const isOpen = openEmp === name;
              const list = grouped.get(name) || [];
              return (
                <div className="bg-white rounded-lg shadow" key={name}>
                  <button
                    onClick={() => setOpenEmp((p) => (p === name ? null : name))}
                    className={`w-full flex justify-between items-center px-4 py-3 text-left ${
                      isOpen ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#3d3d3d]">{name}</span>
                      <span className="text-xs text-gray-500">{list.length} task(s)</span>
                    </div>
                    <span className="text-sm">{isOpen ? "▲" : "▼"}</span>
                  </button>

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
    </Layout>
  );
}
