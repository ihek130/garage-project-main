import React, { useEffect, useMemo, useState } from "react";
import Layout from "../Layout";
import Notification from "../Pages/images/Notification.png";

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

const CUSTOMER_ENDPOINT_CANDIDATES = [
  "/customer/get/Customer",
  "/customer/get/customers",
  "/customer/get/E-customer",
  "/customer/getdata",
  "/customer/get/customer",
  "/customer/get",
];

async function tryJson(base, paths) {
  for (const p of paths) {
    try {
      console.log(`Trying endpoint: ${base}${p}`);
      const res = await fetch(`${base}${p}`);
      console.log(`Response status for ${p}:`, res.status);
      if (!res.ok) continue;
      const j = await res.json();
      console.log(`Response data for ${p}:`, j);
      if (Array.isArray(j)) return j;
      if (j && Array.isArray(j.customers)) return j.customers;
      if (j && Array.isArray(j.rows)) return j.rows;
    } catch (error) {
      console.log(`Error with endpoint ${p}:`, error);
    }
  }
  return [];
}

function toPublicUrl(file_path) {
  if (!file_path) return "";
  if (file_path.startsWith("assets/")) return `${API_BASE}/${file_path}`;
  return `${API_BASE}/assets/${file_path}`.replace(/\/+$/, "");
}

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [openIdx, setOpenIdx] = useState(null);
  const [search, setSearch] = useState("");
  const [invoicesByName, setInvoicesByName] = useState({});
  const [totalsByName, setTotalsByName] = useState({});
  const [filesByInvoice, setFilesByInvoice] = useState({});
  const [openFiles, setOpenFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    contact: '',
    location: '',
    description: ''
  });
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: '',
    name: '',
    contact: '',
    location: '',
    description: '',
    vehicle: '',
    amount: '',
    date: ''
  });

  useEffect(() => {
    (async () => {
      console.log('Fetching customers from endpoints:', CUSTOMER_ENDPOINT_CANDIDATES);
      const data = await tryJson(API_BASE, CUSTOMER_ENDPOINT_CANDIDATES);
      console.log('Received customer data:', data);
      const normalized = data
        .map((r) => {
          const name =
            r.name || r.names || r.customer_name || r.customer || r.Customer || r.company || r.Company || "";
          return { ...r, __name: String(name).trim() };
        })
        .filter((r) => r.__name);
      console.log('Normalized customers:', normalized);
      const map = new Map();
      for (const r of normalized) if (!map.has(r.__name)) map.set(r.__name, r);
      setCustomers(Array.from(map.values()));
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.__name.toLowerCase().includes(q));
  }, [customers, search]);

  function toggle(idx, name) {
    setOpenIdx((prev) => (prev === idx ? null : idx));
    if (openIdx !== idx) loadCustomerData(name);
  }

  async function loadCustomerData(name) {
    try {
      let invRes = await fetch(`${API_BASE}/invoice/by-customer/${encodeURIComponent(name)}`);
      if (!invRes.ok) {
        const allRes = await fetch(`${API_BASE}/invoice/get/E-invoice`);
        const all = (await allRes.json()) || [];
        const filtered = all.filter(
          (r) =>
            String(r.name || r.names || r.customer_name || r.customer || "")
              .trim()
              .toLowerCase() === name.toLowerCase()
        );
        setInvoicesByName((prev) => ({ ...prev, [name]: filtered }));
      } else {
        const { invoices } = await invRes.json();
        setInvoicesByName((prev) => ({ ...prev, [name]: invoices || [] }));
      }
    } catch {}

    try {
      const sumRes = await fetch(
        `${API_BASE}/invoice/summary/by-customer/${encodeURIComponent(name)}`
      );
      if (!sumRes.ok) throw new Error();
      const { totals } = await sumRes.json();
      setTotalsByName((p) => ({ ...p, [name]: totals }));
    } catch {
      const inv = invoicesByName[name] || [];
      let totalAmount = 0,
        totalPending = 0;
      for (const r of inv) {
        const amt = Number(r.amount || 0);
        const adv = Number(r.advance || 0);
        const pen = Number(r.pending ?? Math.max(amt - adv, 0));
        totalAmount += amt;
        totalPending += Math.max(pen, 0);
      }
      const totals = {
        totalAmount,
        totalPending,
        totalReceived: totalAmount - totalPending,
        projectedAfterPending: totalAmount,
      };
      setTotalsByName((p) => ({ ...p, [name]: totals }));
    }
  }

  async function uploadFiles(invoiceId, files) {
    if (!invoiceId || !files?.length) return;
    try {
      setUploading((u) => ({ ...u, [invoiceId]: true }));
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch(`${API_BASE}/invoice/${invoiceId}/files`, {
        method: "POST",
        body: form,
      });
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
      const files = Array.isArray(j.files) ? j.files : [];
      setFilesByInvoice((p) => ({ ...p, [invoiceId]: files }));
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

  async function createNewCustomer() {
    try {
      if (!newCustomerForm.name.trim()) {
        alert('Customer name is required');
        return;
      }

      const response = await fetch(`${API_BASE}/customer/add-new-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomerForm),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Customer created successfully!');
        setShowNewCustomerForm(false);
        setNewCustomerForm({ name: '', contact: '', location: '', description: '' });
        // Refresh customers list
        window.location.reload();
      } else {
        alert(result.Message || 'Error creating customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    }
  }

  function startEditCustomer(customer) {
    setEditingCustomer(customer.id || customer.ID);
    setEditCustomerForm({
      id: customer.id || customer.ID,
      name: customer.__name || customer.name || customer.names || '',
      contact: customer.contact || '',
      location: customer.location || '',
      description: customer.description || '',
      vehicle: customer.vehicle || '',
      amount: customer.amount || '',
      date: customer.date || ''
    });
  }

  function cancelEdit() {
    setEditingCustomer(null);
    setEditCustomerForm({
      id: '',
      name: '',
      contact: '',
      location: '',
      description: '',
      vehicle: '',
      amount: '',
      date: ''
    });
  }

  async function updateCustomer() {
    try {
      if (!editCustomerForm.name.trim()) {
        alert('Customer name is required');
        return;
      }

      const response = await fetch(`${API_BASE}/customer/update/${editCustomerForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editCustomerForm.name,
          contact: editCustomerForm.contact,
          location: editCustomerForm.location,
          description: editCustomerForm.description,
          vehicle: editCustomerForm.vehicle,
          amount: editCustomerForm.amount,
          date: editCustomerForm.date
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Customer updated successfully!');
        cancelEdit();
        // Refresh customers list
        window.location.reload();
      } else {
        alert(result.Message || 'Error updating customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer');
    }
  }

  async function deleteCustomer(customerId) {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/customer/delete/${customerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Customer deleted successfully!');
        // Refresh customers list
        window.location.reload();
      } else {
        alert(result.Message || 'Error deleting customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer');
    }
  }

  // ---------- UI ----------
  return (
    <Layout>
      <div className="page-header">
        <h2 className="text-xl font-bold text-[#3d3d3d]">Customers</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
            className="btn-primary text-sm"
          >
            {showNewCustomerForm ? 'Cancel' : 'Add New Customer'}
          </button>
          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input w-full md:w-64"
          />
          <img className="w-8 h-8 cursor-pointer" src={Notification} alt="icon" title="Notifications" />
        </div>
      </div>

      <div className="main-content">{/* Forms and content will go here */}

        {/* New Customer Form */}
        {showNewCustomerForm && (
          <div className="p-4 md:p-6 bg-blue-50 border-b">
            <div className="card">
              <h3 className="text-lg font-semibold text-[#3d3d3d] mb-4">Add New Customer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
                    className="form-input"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    value={newCustomerForm.contact}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, contact: e.target.value})}
                    className="form-input"
                    placeholder="Phone/Email"
                  />
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={newCustomerForm.location}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, location: e.target.value})}
                    className="form-input"
                    placeholder="Customer location"
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={newCustomerForm.description}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, description: e.target.value})}
                    className="form-input"
                    placeholder="Brief description"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={createNewCustomer}
                  className="btn-primary"
                >
                  Create Customer
                </button>
                <button 
                  onClick={() => setShowNewCustomerForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Form */}
        {editingCustomer && (
          <div className="p-4 md:p-6 bg-yellow-50 border-b">
            <div className="card">
              <h3 className="text-lg font-semibold text-[#3d3d3d] mb-4">Edit Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    value={editCustomerForm.name}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, name: e.target.value})}
                    className="form-input"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    value={editCustomerForm.contact}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, contact: e.target.value})}
                    className="form-input"
                    placeholder="Phone/Email"
                  />
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={editCustomerForm.location}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, location: e.target.value})}
                    className="form-input"
                    placeholder="Customer location"
                  />
                </div>
                <div>
                  <label className="form-label">Vehicle</label>
                  <input
                    type="text"
                    value={editCustomerForm.vehicle}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, vehicle: e.target.value})}
                    className="form-input"
                    placeholder="Vehicle details"
                  />
                </div>
                <div>
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    value={editCustomerForm.amount}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, amount: e.target.value})}
                    className="form-input"
                    placeholder="Amount"
                  />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={editCustomerForm.date}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, date: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea
                    value={editCustomerForm.description}
                    onChange={(e) => setEditCustomerForm({...editCustomerForm, description: e.target.value})}
                    className="form-input"
                    placeholder="Brief description"
                    rows="3"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={updateCustomer}
                  className="btn-primary"
                >
                  Update Customer
                </button>
                <button 
                  onClick={cancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop accordions */}
        <div className="p-4 md:p-6 hidden md:block">
          <div className="space-y-3">
            {filtered.map((c, idx) => {
              const name = c.__name;
              const isOpen = openIdx === idx;
              const totals = totalsByName[name];
              return (
                <div className="card" key={name}>
                  <div className={`flex items-center px-4 py-3 ${isOpen ? "border-b" : ""}`}>
                    <button
                      onClick={() => toggle(idx, name)}
                      className="flex-1 flex justify-between items-center text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#3d3d3d]">{name}</span>
                        {totals && (
                          <span className="text-xs text-gray-500">
                            Received: <b>{totals.totalReceived}</b> • Pending: <b>{totals.totalPending}</b> • Projected: <b>{totals.projectedAfterPending}</b>
                          </span>
                        )}
                      </div>
                      <span className="text-sm">{isOpen ? "▲" : "▼"}</span>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditCustomer(c);
                        }}
                        className="btn-outline text-xs"
                        title="Edit Customer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomer(c.id || c.ID);
                        }}
                        className="btn-outline text-xs bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                        title="Delete Customer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Total Received</div>
                          <div className="text-xl font-semibold">{totals ? totals.totalReceived : "-"}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Total Pending</div>
                          <div className="text-xl font-semibold">{totals ? totals.totalPending : "-"}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Projected After Pending</div>
                          <div className="text-xl font-semibold">{totals ? totals.projectedAfterPending : "-"}</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded overflow-hidden">
                          <thead>
                            <tr className="bg-gray-100 text-[#3d3d3d]">
                              <th className="py-2 px-3 text-left text-xs">#</th>
                              <th className="py-2 px-3 text-left text-xs">Date</th>
                              <th className="py-2 px-3 text-left text-xs">Amount</th>
                              <th className="py-2 px-3 text-left text-xs">Advance</th>
                              <th className="py-2 px-3 text-left text-xs">Pending</th>
                              <th className="py-2 px-3 text-left text-xs">Status</th>
                              <th className="py-2 px-3 text-left text-xs">Attachments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(invoicesByName[name] || []).map((inv) => {
                              const pending =
                                inv.pending != null
                                  ? Number(inv.pending)
                                  : Math.max(Number(inv.amount || 0) - Number(inv.advance || 0), 0);
                              const isOpenFiles = !!openFiles[inv.id];
                              const files = filesByInvoice[inv.id];

                              return (
                                <tr key={inv.id} className="border-t align-top">
                                  <td className="py-2 px-3 text-sm">{inv.id}</td>
                                  <td className="py-2 px-3 text-sm">
                                    {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
                                  </td>
                                  <td className="py-2 px-3 text-sm">{inv.amount ?? ""}</td>
                                  <td className="py-2 px-3 text-sm">{inv.advance ?? ""}</td>
                                  <td className="py-2 px-3 text-sm">{pending}</td>
                                  <td className="py-2 px-3 text-sm">{inv.status || ""}</td>
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
                                </tr>
                              );
                            })}
                            {(invoicesByName[name] || []).length === 0 && (
                              <tr>
                                <td colSpan="7" className="py-6 text-center text-sm text-gray-500">No invoices yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-sm text-gray-500">No customers found.</div>}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="p-4 md:p-6 md:hidden">
          <div className="space-y-3">
            {filtered.map((c, idx) => {
              const name = c.__name;
              const isOpen = openIdx === idx;
              const totals = totalsByName[name];

              return (
                <div key={name} className="card">
                  <div className="px-4 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <button
                        onClick={() => toggle(idx, name)}
                        className="flex-1 text-left"
                      >
                        <div className="font-semibold text-[#3d3d3d]">{name}</div>
                        {totals && (
                          <div className="text-[11px] text-gray-500">
                            Recv <b>{totals.totalReceived}</b> • Pend <b>{totals.totalPending}</b> • Proj <b>{totals.projectedAfterPending}</b>
                          </div>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditCustomer(c);
                          }}
                          className="btn-outline text-xs"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomer(c.id || c.ID);
                          }}
                          className="btn-outline text-xs bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                          title="Delete"
                        >
                          Del
                        </button>
                        <button
                          onClick={() => toggle(idx, name)}
                          className="text-sm"
                        >
                          {isOpen ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t">
                      {(invoicesByName[name] || []).map((inv) => {
                        const pending =
                          inv.pending != null
                            ? Number(inv.pending)
                            : Math.max(Number(inv.amount || 0) - Number(inv.advance || 0), 0);
                        const isOpenFiles = !!openFiles[inv.id];
                        const files = filesByInvoice[inv.id];

                        return (
                          <div key={inv.id} className="border rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xs text-gray-500">#{inv.id}</div>
                                <div className="text-xs text-gray-500">
                                  {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] text-gray-500">Pending</div>
                                <div className="text-base font-semibold">{pending}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-gray-500">Amount</div>
                                <div className="font-semibold">{inv.amount ?? "-"}</div>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-gray-500">Advance</div>
                                <div className="font-semibold">{inv.advance ?? "-"}</div>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-gray-500">Status</div>
                                <div className="font-semibold">{inv.status || "-"}</div>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <label className="text-xs border px-3 py-1 rounded">
                                <input type="file" className="hidden" multiple onChange={(e) => uploadFiles(inv.id, e.target.files)} />
                                {uploading[inv.id] ? "Uploading..." : "Upload"}
                              </label>
                              <button className="text-xs border px-3 py-1 rounded" onClick={() => toggleFiles(inv.id)}>
                                {isOpenFiles ? "Hide files" : "View files"}
                              </button>
                            </div>

                            {isOpenFiles && (
                              <div className="mt-2 bg-gray-50 rounded p-2">
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
                        );
                      })}
                      {(invoicesByName[name] || []).length === 0 && (
                        <div className="text-xs text-gray-500">No invoices yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500">No customers found.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
