import React, { useEffect, useMemo, useState } from "react";
import Logo from "../Pages/images/logo.jpeg";
import Notification from "../Pages/images/Notification.png";
import Navigation from "../Navigation";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Fallbacks for endpoints
const INCOME_LIST_CANDIDATES = [
  "/income/get/E-income",
  "/income/get/Income",
  "/income/get/income",
  "/income/get",
];

const EXPENSES_LIST_CANDIDATES = [
  "/expense/get/E-expense",
  "/expense/get/Expenses",
  "/expense/get/expense",
  "/expense/get",
];

async function tryJson(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(`${API_BASE}${p}`);
      if (!res.ok) continue;
      const j = await res.json();
      if (Array.isArray(j)) return j;
      if (j && Array.isArray(j.rows)) return j.rows;
    } catch {}
  }
  return [];
}

export default function Income() {
  const [rows, setRows] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [incomeData, expenseData] = await Promise.all([
        tryJson(INCOME_LIST_CANDIDATES),
        tryJson(EXPENSES_LIST_CANDIDATES),
      ]);

      const normalizedIncome = (incomeData || []).map((r) => ({
        id: r.id ?? r.ID ?? Math.random().toString(36).slice(2),
        name: r.name || r.customer || r.source || r.Source || "(unknown)",
        date: r.date || r.created_at || r.dt || null,
        amount: Number(r.amount ?? r.total ?? r.value ?? 0),
        notes: r.notes || r.remark || "",
        type: r.type || r.category || "income",
      }));

      const normalizedExpenses = (expenseData || []).map((r) => ({
        amount: Number(r.amount ?? r.total ?? 0),
      }));

      // newest first
      normalizedIncome.sort((a, b) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });

      setRows(normalizedIncome);
      setExpenses(normalizedExpenses);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.id, r.name, r.amount, r.notes, r.type]
        .filter((x) => x !== undefined && x !== null)
        .map((s) => String(s).toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    const totalIncome = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const net = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, net };
  }, [filtered, expenses]);

  // ---------- UI ----------
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
        <header className="bg-white shadow p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-xl font-bold text-[#3d3d3d]">Income</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search income..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72 px-3 py-2 border rounded shadow-sm text-sm"
            />
            <img className="w-8 h-8 cursor-pointer" src={Notification} alt="icon" title="Notifications" />
          </div>
        </header>

        {/* Summary cards (both views) */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500">Total Income (filtered)</div>
            <div className="text-2xl font-semibold">{totals.totalIncome}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500">Total Expenses (all)</div>
            <div className="text-2xl font-semibold">{totals.totalExpenses}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500">Net (Income − Expenses)</div>
            <div className="text-2xl font-semibold">{totals.net}</div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="p-4 md:p-6 hidden md:block">
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="min-w-full bg-white rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-[#3d3d3d]">
                  <th className="py-2 px-3 text-left text-xs">#</th>
                  <th className="py-2 px-3 text-left text-xs">Customer/Source</th>
                  <th className="py-2 px-3 text-left text-xs">Date</th>
                  <th className="py-2 px-3 text-left text-xs">Amount</th>
                  <th className="py-2 px-3 text-left text-xs">Type</th>
                  <th className="py-2 px-3 text-left text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-2 px-3 text-sm">{r.id}</td>
                      <td className="py-2 px-3 text-sm">{r.name}</td>
                      <td className="py-2 px-3 text-sm">
                        {r.date ? new Date(r.date).toLocaleDateString() : ""}
                      </td>
                      <td className="py-2 px-3 text-sm">{r.amount}</td>
                      <td className="py-2 px-3 text-sm">{r.type}</td>
                      <td className="py-2 px-3 text-sm">{r.notes}</td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-sm text-gray-500">
                      No income records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="p-4 md:p-6 md:hidden">
          {loading && <div className="text-sm text-gray-500 text-center">Loading…</div>}
          {!loading && (
            <div className="space-y-3">
              {filtered.map((r) => (
                <div key={r.id} className="bg-white rounded-lg shadow p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-gray-500">#{r.id}</div>
                      <div className="font-semibold text-[#3d3d3d]">{r.name}</div>
                      <div className="text-xs text-gray-500">
                        {r.date ? new Date(r.date).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-gray-500">Amount</div>
                      <div className="text-lg font-semibold">{r.amount}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Type</div>
                      <div className="font-semibold">{r.type}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 col-span-2">
                      <div className="text-gray-500">Notes</div>
                      <div className="font-semibold break-words">{r.notes || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-gray-500 text-center">No income records.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
