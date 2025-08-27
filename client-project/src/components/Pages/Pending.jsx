import React, { useEffect, useMemo, useState } from "react";
import Logo from "../Pages/images/logo.jpeg";
import Notification from "../Pages/images/Notification.png";
import Navigation from "../Navigation";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Fallback endpoints (your backend had multiple route spellings)
const PENDING_LIST_CANDIDATES = [
  "/pending/get/E-pending",
  "/pending/get/Pending",
  "/pending/get/pending",
  "/pending/get",
];

const INVOICE_LIST_FALLBACK = "/invoice/get/E-invoice"; // used if pending endpoints not present

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
  return null;
}

export default function Pending() {
  const [rows, setRows] = useState([]); // unified pending rows
  const [search, setSearch] = useState("");
  const [receiveAmount, setReceiveAmount] = useState({}); // id -> amount string
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Try real pending endpoints
      let pending = await tryJson(PENDING_LIST_CANDIDATES);

      // 2) Derive from invoices if pending not available
      if (!pending) {
        try {
          const res = await fetch(`${API_BASE}${INVOICE_LIST_FALLBACK}`);
          const invs = (await res.json()) || [];
          pending = invs
            .map((r) => {
              const amount = Number(r.amount || 0);
              const advance = Number(r.advance || 0);
              const pend = Number(
                r.pending != null ? r.pending : Math.max(amount - advance, 0)
              );
              if (pend > 0) {
                return {
                  id: r.id,
                  name: r.name || r.customer || r.company || "-",
                  date: r.date,
                  amount,
                  advance,
                  pending: pend,
                  status: r.status || "pending",
                };
              }
              return null;
            })
            .filter(Boolean);
        } catch {
          pending = [];
        }
      }

      // Normalize minimal shape
      const normalized = (pending || []).map((r) => ({
        id: r.id ?? r.ID ?? r.invoice_id ?? r.pending_id ?? Math.random().toString(36).slice(2),
        name:
          r.name || r.customer || r.company || r.customer_name || r.Customer || "(unknown)",
        date: r.date || r.created_at || r.dt || null,
        amount: Number(r.amount ?? r.total ?? 0),
        advance: Number(r.advance ?? r.received ?? 0),
        pending: Number(
          r.pending != null
            ? r.pending
            : Math.max(Number(r.amount ?? 0) - Number(r.advance ?? 0), 0)
        ),
        status: r.status || "pending",
      }));

      // Sort by highest pending first
      normalized.sort((a, b) => b.pending - a.pending);

      setRows(normalized);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.id, r.name, r.status, r.pending, r.amount]
        .filter((x) => x !== undefined && x !== null)
        .map((s) => String(s).toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    let totalPending = 0, totalAmount = 0, totalReceived = 0;
    for (const r of filtered) {
      totalPending += Number(r.pending || 0);
      totalAmount += Number(r.amount || 0);
      totalReceived += Number(r.amount || 0) - Number(r.pending || 0);
    }
    return { totalAmount, totalPending, totalReceived };
  }, [filtered]);

  const getReceive = (id) => receiveAmount[id] || "";

  async function markReceived(id) {
    const amt = Number(getReceive(id) || 0);
    if (!isFinite(amt) || amt <= 0) return alert("Enter a valid received amount.");
    try {
      const res = await fetch(`${API_BASE}/pending/derived/mark-received/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountReceived: amt }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return alert(j?.Message || "Failed to update pending");
      }
      setReceiveAmount((p) => ({ ...p, [id]: "" }));
      // Refresh a single row locally for UX
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, pending: Math.max(Number(r.pending || 0) - amt, 0) }
            : r
        )
      );
    } catch {
      alert("Failed to update pending");
    }
  }

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
          <h2 className="text-xl font-bold text-[#3d3d3d]">Pending</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by name, amount..."
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
            <div className="text-xs text-gray-500">Total Amount</div>
            <div className="text-2xl font-semibold">{totals.totalAmount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500">Total Received</div>
            <div className="text-2xl font-semibold">{totals.totalReceived}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500">Total Pending</div>
            <div className="text-2xl font-semibold">{totals.totalPending}</div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="p-4 md:p-6 hidden md:block">
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="min-w-full bg-white rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-[#3d3d3d]">
                  <th className="py-2 px-3 text-left text-xs">#</th>
                  <th className="py-2 px-3 text-left text-xs">Customer</th>
                  <th className="py-2 px-3 text-left text-xs">Date</th>
                  <th className="py-2 px-3 text-left text-xs">Amount</th>
                  <th className="py-2 px-3 text-left text-xs">Pending</th>
                  <th className="py-2 px-3 text-left text-xs">Status</th>
                  <th className="py-2 px-3 text-left text-xs">Receive</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-sm text-gray-500">
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
                      <td className="py-2 px-3 text-sm font-semibold">{r.pending}</td>
                      <td className="py-2 px-3 text-sm">{r.status}</td>
                      <td className="py-2 px-3 text-sm">
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1 text-sm w-28"
                            placeholder="Amount"
                            value={receiveAmount[r.id] || ""}
                            onChange={(e) =>
                              setReceiveAmount((p) => ({ ...p, [r.id]: e.target.value }))
                            }
                          />
                          <button
                            className="bg-[#ea8732] text-white px-3 py-1 rounded text-sm"
                            onClick={() => markReceived(r.id)}
                            disabled={Number(r.pending) <= 0}
                            title={Number(r.pending) <= 0 ? "Nothing pending" : "Mark received"}
                          >
                            Receive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-sm text-gray-500">
                      No pending records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="p-4 md:p-6 md:hidden">
          {loading && (
            <div className="text-sm text-gray-500 text-center">Loading…</div>
          )}
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
                      <div className="text-[11px] text-gray-500">Pending</div>
                      <div className="text-lg font-semibold">{r.pending}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Amount</div>
                      <div className="font-semibold">{r.amount}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Status</div>
                      <div className="font-semibold">{r.status}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Date</div>
                      <div className="font-semibold">
                        {r.date ? new Date(r.date).toLocaleDateString() : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1 text-sm w-32"
                      placeholder="Receive amount"
                      value={receiveAmount[r.id] || ""}
                      onChange={(e) =>
                        setReceiveAmount((p) => ({ ...p, [r.id]: e.target.value }))
                      }
                    />
                    <button
                      className="bg-[#ea8732] text-white px-3 py-1 rounded text-sm"
                      onClick={() => markReceived(r.id)}
                      disabled={Number(r.pending) <= 0}
                    >
                      Receive
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-gray-500 text-center">
                  No pending records.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
