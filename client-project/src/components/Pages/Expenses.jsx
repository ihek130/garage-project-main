import React, { useEffect, useMemo, useState } from "react";
import Logo from "../Pages/images/logo.jpeg";
import Notification from "../Pages/images/Notification.png";
import Navigation from "../Navigation";


const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    vehicle: "",
    description: "",
    date: "",
    amount: "",
    payment_status: "paid",
  });

  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  function inRange(dateStr) {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d)) return true;
    const { start, end } = dateFilter;
    let ok = true;
    if (start) ok = ok && d >= new Date(start);
    if (end) ok = ok && d <= new Date(end);
    return ok;
  }

  async function fetchAll() {
    try {
      const res = await fetch(`${API_BASE}/expense/get/Eexpenses`);
      const j = await res.json();
      setItems(Array.isArray(j) ? j : Array.isArray(j?.rows) ? j.rows : []);
    } catch (e) {
      console.error("fetch expenses error:", e);
      setItems([]);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const values = [
        r.id,
        r.name,
        r.vehicle,
        r.description,
        r.payment_status,
        r.amount,
        r.date,
      ]
        .filter((x) => x !== undefined && x !== null)
        .map(String)
        .map((s) => s.toLowerCase());
      const within = inRange(r.date);
      const match = q ? values.some((v) => v.includes(q)) : true;
      return within && match;
    });
  }, [items, search, dateFilter]);

  const total = useMemo(() => {
    let sum = 0;
    for (const r of filtered) {
      const val = Number(r.amount || 0);
      sum += isFinite(val) ? val : 0;
    }
    return sum;
  }, [filtered]);

  function openCreate() {
    setFormOpen(true);
    setEditId(null);
    setForm({
      name: "",
      vehicle: "",
      description: "",
      date: new Date().toISOString().slice(0,10),
      amount: "",
      payment_status: "paid",
    });
  }

  function openEdit(row) {
    setFormOpen(true);
    setEditId(row.id);
    setForm({
      name: row.name || "",
      vehicle: row.vehicle || "",
      description: row.description || "",
      date: row.date ? new Date(row.date).toISOString().slice(0,10) : "",
      amount: row.amount ?? "",
      payment_status: row.payment_status || "paid",
    });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      const url = editId
        ? `${API_BASE}/expense/update/${editId}`
        : `${API_BASE}/expense/post/Eexpenses`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ok = res.status === 201 || res.ok;
      if (!ok) {
        const j = await res.json().catch(() => ({}));
        return alert(j?.Message || "Save failed");
      }
      setFormOpen(false);
      await fetchAll();
    } catch (e) {
      console.error("save expense error:", e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`${API_BASE}/expense/delete/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return alert(j?.Message || "Delete failed");
      }
      await fetchAll();
    } catch (e) {
      console.error("delete expense error:", e);
      alert("Delete failed");
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-white flex-shrink-0 fixed h-full">
        <div className="p-6">
          <img className="w-24 h-24 text-white p-2" src={Logo} alt="Logo" />
          <Navigation />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col ml-64">
        <header className="bg-white shadow p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3d3d3d]">Expenses</h2>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className="px-3 py-2 border rounded text-sm"
              value={dateFilter.start}
              onChange={(e) => setDateFilter((d) => ({ ...d, start: e.target.value }))}
            />
            <input
              type="date"
              className="px-3 py-2 border rounded text-sm"
              value={dateFilter.end}
              onChange={(e) => setDateFilter((d) => ({ ...d, end: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 px-3 py-2 border rounded shadow-sm text-sm"
            />
            <img
              className="w-8 h-8 cursor-pointer mr-2"
              src={Notification}
              alt="icon"
              title="Notifications"
            />
          </div>
        </header>

        {/* Summary + Add */}
        <div className="p-6 flex items-center justify-between">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-600">Total Expenses (in range)</div>
            <div className="text-2xl font-semibold">{total}</div>
          </div>
          <button
            onClick={openCreate}
            className="bg-[#ea8732] text-white px-4 py-2 rounded text-sm"
          >
            + Add Expense
          </button>
        </div>

        {/* Table */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="min-w-full bg-white rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-[#3d3d3d]">
                  <th className="py-2 px-3 text-left text-xs">#</th>
                  <th className="py-2 px-3 text-left text-xs">Name</th>
                  <th className="py-2 px-3 text-left text-xs">Vehicle</th>
                  <th className="py-2 px-3 text-left text-xs">Description</th>
                  <th className="py-2 px-3 text-left text-xs">Date</th>
                  <th className="py-2 px-3 text-left text-xs">Amount</th>
                  <th className="py-2 px-3 text-left text-xs">Payment Status</th>
                  <th className="py-2 px-3 text-left text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-2 px-3 text-sm">{row.id}</td>
                    <td className="py-2 px-3 text-sm">{row.name || ""}</td>
                    <td className="py-2 px-3 text-sm">{row.vehicle || ""}</td>
                    <td className="py-2 px-3 text-sm">{row.description || ""}</td>
                    <td className="py-2 px-3 text-sm">
                      {row.date ? new Date(row.date).toLocaleDateString() : ""}
                    </td>
                    <td className="py-2 px-3 text-sm">{row.amount ?? ""}</td>
                    <td className="py-2 px-3 text-sm">{row.payment_status || ""}</td>
                    <td className="py-2 px-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          className="border px-3 py-1 rounded text-sm"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="border px-3 py-1 rounded text-sm"
                          onClick={() => remove(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-6 text-center text-sm text-gray-500">
                      No expenses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit form */}
        {formOpen && (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">
                {editId ? "Edit Expense" : "Add Expense"}
              </h3>
              <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Vehicle"
                  value={form.vehicle}
                  onChange={(e) => setForm((p) => ({ ...p, vehicle: e.target.value }))}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
                <input
                  type="date"
                  className="border rounded px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={form.payment_status}
                  onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value }))}
                >
                  <option value="paid">paid</option>
                  <option value="unpaid">unpaid</option>
                </select>

                <div className="md:col-span-6 flex gap-2">
                  <button
                    type="submit"
                    className="bg-[#ea8732] text-white px-4 py-2 rounded text-sm"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="border px-3 py-2 rounded text-sm"
                    onClick={() => setFormOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
