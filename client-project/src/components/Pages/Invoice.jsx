import React, { useEffect, useMemo, useState } from "react";
import Logo from "../Pages/images/logo.jpeg";
import Notification from "../Pages/images/Notification.png";
import Navigation from "../Navigation";
import InvoiceTemplateModal from "./InvoiceTemplateModal";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

function toPublicUrl(file_path) {
  if (!file_path) return "";
  if (file_path.startsWith("assets/")) return `${API_BASE}/${file_path}`;
  return `${API_BASE}/assets/${file_path}`.replace(/\/+$/, "");
}

export default function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState({});
  const [receiveAmount, setReceiveAmount] = useState({});
  const [filesByInvoice, setFilesByInvoice] = useState({});
  const [openFiles, setOpenFiles] = useState({});
  const [tplOpen, setTplOpen] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState({});

  async function fetchAll() {
    try {
      const res = await fetch(`${API_BASE}/invoice/get/E-invoice`);
      const j = await res.json();
      setInvoices(Array.isArray(j) ? j : []);
    } catch {
      setInvoices([]);
    }
  }
  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((r) =>
      [r.id, r.customer_name, r.company, r.status, r.total_amount, r.advance, r.pending, r.invoice_no]
        .filter((x) => x !== undefined && x !== null)
        .map((s) => String(s).toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [invoices, search]);

  // Group invoices by customer
  const groupedInvoices = useMemo(() => {
    const groups = {};
    filtered.forEach((invoice) => {
      const customerKey = invoice.customer_name || 'Unknown Customer';
      if (!groups[customerKey]) {
        groups[customerKey] = [];
      }
      groups[customerKey].push(invoice);
    });
    
    // Sort each group by date (newest first)
    Object.keys(groups).forEach(customerKey => {
      groups[customerKey].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    });
    
    return groups;
  }, [filtered]);

  const toggleCustomerExpansion = (customerName) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerName]: !prev[customerName]
    }));
  };

  async function uploadFiles(invoiceId, files) {
    if (!invoiceId || !files?.length) return;
    try {
      setUploading((u) => ({ ...u, [invoiceId]: true }));
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch(`${API_BASE}/invoice/${invoiceId}/files`, { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.Message || "Upload failed");
      } else {
        await loadFiles(invoiceId);
        alert("Files uploaded");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading((u) => ({ ...u, [invoiceId]: false }));
    }
  }

  async function loadFiles(invoiceId) {
    try {
      const res = await fetch(`${API_BASE}/invoice/${invoiceId}/files`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      setFilesByInvoice((p) => ({ ...p, [invoiceId]: Array.isArray(j.files) ? j.files : [] }));
    } catch {
      setFilesByInvoice((p) => ({ ...p, [invoiceId]: [] }));
    }
  }

  function toggleFiles(invoiceId) {
    setOpenFiles((p) => {
      const next = { ...p, [invoiceId]: !p[invoiceId] };
      if (next[invoiceId] && !filesByInvoice[invoiceId]) loadFiles(invoiceId);
      return next;
    });
  }

  const getReceive = (id) => receiveAmount[id] || "";
  
  async function updateInvoiceStatus(id, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/invoice/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return alert(j?.Message || "Failed to update invoice status");
      }
      
      await fetchAll();
    } catch {
      alert("Failed to update invoice status");
    }
  }
  
  async function markReceived(id) {
    const amt = Number(getReceive(id) || 0);
    if (!isFinite(amt) || amt <= 0) return alert("Enter a valid received amount.");
    
    try {
      // Get current invoice data to calculate new advance and pending
      const currentInvoice = invoices.find(inv => inv.id === id);
      if (!currentInvoice) return alert("Invoice not found");
      
      const currentAdvance = Number(currentInvoice.advance || 0);
      const totalAmount = Number(currentInvoice.total_amount || 0);
      const newAdvance = currentAdvance + amt;
      const newPending = Math.max(totalAmount - newAdvance, 0);
      const newStatus = newPending <= 0 ? "received" : "pending";
      
      const res = await fetch(`${API_BASE}/invoice/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          advance: newAdvance,
          pending: newPending,
          status: newStatus
        }),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return alert(j?.Message || "Failed to update invoice");
      }
      
      setReceiveAmount((p) => ({ ...p, [id]: "" }));
      await fetchAll();
    } catch {
      alert("Failed to update invoice");
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
        <header className="bg-white shadow p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-xl font-bold text-[#3d3d3d]">Invoice</h2>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => window.location.href = '/employeetask'}
            >
              Generate from Tasks
            </button>
            <button
              className="bg-[#ea8732] text-white px-3 md:px-4 py-2 rounded text-sm"
              onClick={() => setTplOpen(true)}
            >
              Generate Invoice (Word)
            </button>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border rounded shadow-sm text-sm"
            />
            <img className="w-8 h-8 cursor-pointer" src={Notification} alt="icon" title="Notifications" />
          </div>
        </header>

        {/* Desktop (md+) table */}
        <div className="p-4 md:p-6 hidden md:block">
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="min-w-full bg-white rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-[#3d3d3d]">
                  <th className="py-2 px-3 text-left text-xs">Invoice #</th>
                  <th className="py-2 px-3 text-left text-xs">Customer</th>
                  <th className="py-2 px-3 text-left text-xs">Date</th>
                  <th className="py-2 px-3 text-left text-xs">Amount</th>
                  <th className="py-2 px-3 text-left text-xs">Advance</th>
                  <th className="py-2 px-3 text-left text-xs">Pending</th>
                  <th className="py-2 px-3 text-left text-xs">Status</th>
                  <th className="py-2 px-3 text-left text-xs">Attachments</th>
                  <th className="py-2 px-3 text-left text-xs">Receive</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedInvoices).map(([customerName, customerInvoices]) => {
                  const isExpanded = expandedCustomers[customerName];
                  const totalInvoices = customerInvoices.length;
                  const totalPending = customerInvoices.reduce((sum, inv) => {
                    const pending = inv.pending != null ? Number(inv.pending) : Math.max(Number(inv.total_amount || 0) - Number(inv.advance || 0), 0);
                    return sum + pending;
                  }, 0);
                  const totalAmount = customerInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

                  return (
                    <React.Fragment key={customerName}>
                      {/* Customer Group Header */}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td className="py-3 px-3 text-sm font-semibold" colSpan="9">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleCustomerExpansion(customerName)}
                                className="flex items-center gap-2 text-blue-700 hover:text-blue-900"
                              >
                                <span className="text-lg">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span className="text-lg">{customerName}</span>
                              </button>
                              <span className="text-sm text-gray-600">
                                ({totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-700">
                                Total: <span className="font-semibold">{totalAmount.toFixed(2)}</span>
                              </span>
                              <span className="text-orange-700">
                                Pending: <span className="font-semibold">{totalPending.toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Customer Invoices */}
                      {isExpanded && customerInvoices.map((inv) => {
                        const pending =
                          inv.pending != null
                            ? Number(inv.pending)
                            : Math.max(Number(inv.total_amount || 0) - Number(inv.advance || 0), 0);
                        const isOpenFiles = !!openFiles[inv.id];
                        const files = filesByInvoice[inv.id];
                        return (
                          <tr key={inv.id} className="border-t align-top bg-white">
                            <td className="py-2 px-3 text-sm pl-8">{inv.invoice_no || inv.id}</td>
                            <td className="py-2 px-3 text-sm text-gray-500">—</td>
                            <td className="py-2 px-3 text-sm">
                              {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
                            </td>
                            <td className="py-2 px-3 text-sm">{inv.total_amount ?? ""}</td>
                            <td className="py-2 px-3 text-sm">{inv.advance ?? ""}</td>
                            <td className="py-2 px-3 text-sm">{pending}</td>
                            <td className="py-2 px-3 text-sm">
                              <select 
                                value={inv.status || "pending"} 
                                onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                              >
                                <option value="pending">Pending</option>
                                <option value="received">Received</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-sm">
                              <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                  <label className="block">
                                    <input type="file" className="hidden" multiple onChange={(e) => uploadFiles(inv.id, e.target.files)} />
                                    <span className="inline-block px-3 py-1 border rounded cursor-pointer text-xs">
                                      {uploading[inv.id] ? "Uploading..." : "Upload"}
                                    </span>
                                  </label>
                                  <button className="border px-3 py-1 rounded text-xs" onClick={() => toggleFiles(inv.id)}>
                                    {isOpenFiles ? "Hide files" : "View files"}
                                  </button>
                                </div>
                                {isOpenFiles && (
                                  <div className="bg-gray-50 rounded p-2">
                                    {Array.isArray(files) ? (
                                      files.length > 0 ? (
                                        <ul className="space-y-1">
                                          {files.map((f) => (
                                            <li key={f.id}>
                                              <a
                                                className="text-xs text-blue-600 underline break-all"
                                                href={toPublicUrl(f.file_path)}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                {f.original_name}{" "}
                                                <span className="text-gray-400">({f.mime_type || "file"})</span>
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="text-xs text-gray-500">No files yet.</div>
                                      )
                                    ) : (
                                      <div className="text-xs text-gray-400">Loading files...</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-sm">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="border rounded px-2 py-1 text-sm w-28"
                                  placeholder="Amount"
                                  value={receiveAmount[inv.id] || ""}
                                  onChange={(e) => setReceiveAmount((p) => ({ ...p, [inv.id]: e.target.value }))}
                                />
                                <button
                                  className="bg-[#ea8732] text-white px-3 py-1 rounded text-sm"
                                  onClick={() => markReceived(inv.id)}
                                  disabled={pending <= 0}
                                  title={pending <= 0 ? "Already fully received" : "Mark received"}
                                >
                                  Receive
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {Object.keys(groupedInvoices).length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-6 text-center text-sm text-gray-500">No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile (sm) cards */}
        <div className="p-4 md:p-6 md:hidden">
          <div className="space-y-4">
            {Object.entries(groupedInvoices).map(([customerName, customerInvoices]) => {
              const isExpanded = expandedCustomers[customerName];
              const totalInvoices = customerInvoices.length;
              const totalPending = customerInvoices.reduce((sum, inv) => {
                const pending = inv.pending != null ? Number(inv.pending) : Math.max(Number(inv.total_amount || 0) - Number(inv.advance || 0), 0);
                return sum + pending;
              }, 0);
              const totalAmount = customerInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

              return (
                <div key={customerName} className="bg-white rounded-lg shadow">
                  {/* Customer Group Header */}
                  <div 
                    className="bg-blue-50 rounded-t-lg p-4 border-b cursor-pointer"
                    onClick={() => toggleCustomerExpansion(customerName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-blue-700">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <div className="font-semibold text-blue-900">{customerName}</div>
                          <div className="text-xs text-gray-600">
                            {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-700">Total: {totalAmount.toFixed(2)}</div>
                        <div className="text-orange-700">Pending: {totalPending.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Invoices */}
                  {isExpanded && (
                    <div className="space-y-3 p-3">
                      {customerInvoices.map((inv) => {
                        const pending =
                          inv.pending != null
                            ? Number(inv.pending)
                            : Math.max(Number(inv.total_amount || 0) - Number(inv.advance || 0), 0);
                        const isOpenFiles = !!openFiles[inv.id];
                        const files = filesByInvoice[inv.id];

                        return (
                          <div key={inv.id} className="bg-gray-50 rounded-lg p-3 border">
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <div className="text-sm text-gray-500">#{inv.invoice_no || inv.id}</div>
                                <div className="text-xs text-gray-500">
                                  {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Pending</div>
                                <div className="text-lg font-semibold">{pending}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                              <div className="bg-white rounded p-2">
                                <div className="text-gray-500">Amount</div>
                                <div className="font-semibold">{inv.total_amount ?? "-"}</div>
                              </div>
                              <div className="bg-white rounded p-2">
                                <div className="text-gray-500">Advance</div>
                                <div className="font-semibold">{inv.advance ?? "-"}</div>
                              </div>
                              <div className="bg-white rounded p-2">
                                <div className="text-gray-500">Status</div>
                                <div className="font-semibold">
                                  <select 
                                    value={inv.status || "pending"} 
                                    onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                                    className="bg-transparent border-none text-xs w-full"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="received">Received</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <label className="text-xs border px-3 py-1 rounded bg-white">
                                <input type="file" className="hidden" multiple onChange={(e) => uploadFiles(inv.id, e.target.files)} />
                                {uploading[inv.id] ? "Uploading..." : "Upload"}
                              </label>
                              <button className="text-xs border px-3 py-1 rounded bg-white" onClick={() => toggleFiles(inv.id)}>
                                {isOpenFiles ? "Hide files" : "View files"}
                              </button>
                            </div>

                            {isOpenFiles && (
                              <div className="mt-2 bg-white rounded p-2">
                                {Array.isArray(files) ? (
                                  files.length > 0 ? (
                                    <ul className="space-y-1">
                                      {files.map((f) => (
                                        <li key={f.id}>
                                          <a
                                            className="text-xs text-blue-600 underline break-all"
                                            href={toPublicUrl(f.file_path)}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {f.original_name}{" "}
                                            <span className="text-gray-400">({f.mime_type || "file"})</span>
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-gray-500">No files yet.</div>
                                  )
                                ) : (
                                  <div className="text-xs text-gray-400">Loading files...</div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="border rounded px-2 py-1 text-sm w-32 bg-white"
                                placeholder="Receive amount"
                                value={receiveAmount[inv.id] || ""}
                                onChange={(e) => setReceiveAmount((p) => ({ ...p, [inv.id]: e.target.value }))}
                              />
                              <button
                                className="bg-[#ea8732] text-white px-3 py-1 rounded text-sm"
                                onClick={() => markReceived(inv.id)}
                                disabled={pending <= 0}
                              >
                                Receive
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(groupedInvoices).length === 0 && (
              <div className="text-sm text-gray-500 text-center">No invoices found.</div>
            )}
          </div>
        </div>

        {/* Template Modal */}
        <InvoiceTemplateModal isOpen={tplOpen} onClose={() => setTplOpen(false)} />
      </div>
    </div>
  );
}
