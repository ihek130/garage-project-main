
import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../Layout";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function EmployeeDetails({ onUpdate }) {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({});
  const [labourCardFile, setLabourCardFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [emiratesIdFile, setEmiratesIdFile] = useState(null);
  const [notification, setNotification] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/api/employee/get/employees`)
      .then(res => {
        const rows = res.data?.rows || [];
        setEmployees(rows);
        if (rows.length > 0) setSelectedId(rows[0].id);
      });
  }, [addingNew]);

  useEffect(() => {
    if (selectedId && selectedId !== "new") {
      axios.get(`${API_BASE}/api/employeedetails/${selectedId}`)
        .then(res => setDetails(res.data))
        .catch(() => setDetails(null));
    } else if (selectedId === "new") {
      setDetails(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!details) return;
    // Check expiry dates for notification
    const today = new Date();
    const soon = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const diff = (d - today) / (1000 * 60 * 60 * 24);
      return diff <= 30 && diff >= 0;
    };
    let msg = "";
    if (soon(details.passport_expiry)) msg += "Passport expires soon. ";
    if (soon(details.id_expiry)) msg += "ID expires soon. ";
    if (soon(details.visa_expiry)) msg += "Visa expires soon. ";
    setNotification(msg);
  }, [details]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.name === "labour_card_picture") setLabourCardFile(e.target.files[0]);
    if (e.target.name === "passport_picture") setPassportFile(e.target.files[0]);
    if (e.target.name === "emirates_id_picture") setEmiratesIdFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("id", selectedId);
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (labourCardFile) data.append("labour_card_picture", labourCardFile);
    if (passportFile) data.append("passport_picture", passportFile);
    if (emiratesIdFile) data.append("emirates_id_picture", emiratesIdFile);
    await axios.post(`${API_BASE}/api/employeedetails/update`, data);
    if (onUpdate) onUpdate();
    // Refresh details
    axios.get(`${API_BASE}/api/employeedetails/${selectedId}`)
      .then(res => setDetails(res.data));
  };



  return (
    <Layout title="Employee Details">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <label className="form-label">Select Employee</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-input">
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
            <option value="new">Add New Employee</option>
          </select>
        </div>
      </div>
      {selectedId === "new" ? (
        <div className="card max-w-md mx-auto p-6">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setAddError("");
            if (!newEmployeeName.trim()) return setAddError("Name required");
            try {
              await axios.post(`${API_BASE}/api/employee/create`, { name: newEmployeeName });
              setAddingNew(false);
              setNewEmployeeName("");
              setSelectedId("");
              // Refresh employee list
              axios.get(`${API_BASE}/api/employee/get/employees`).then(res => {
                const rows = res.data?.rows || [];
                setEmployees(rows);
                if (rows.length > 0) setSelectedId(rows[0].id);
              });
            } catch (err) {
              if (err.response?.status === 409) setAddError("Employee already exists");
              else setAddError("Error adding employee");
            }
          }}>
            <label className="form-label">Employee Name</label>
            <input value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="Enter name" className="form-input" />
            <button type="submit" className="btn btn-primary">Add Employee</button>
            {addError && <div className="text-red-500 mt-2">{addError}</div>}
          </form>
        </div>
      ) : (
        <>
          <button onClick={() => setExpanded(!expanded)} className="btn btn-primary mb-4">
            {expanded ? "Hide" : "Show"} Employee Details
          </button>
          {expanded && details && (
            <div className="card max-w-xl mx-auto p-6 details-panel">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="block font-semibold">Employee Name:</label>
                  <input name="name" defaultValue={details.name} onChange={handleChange} className="w-full p-2 rounded border" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Employee ID:</label>
                  <input name="id" value={details.id} disabled className="w-full p-2 rounded border bg-gray-100" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Passport Number:</label>
                  <input name="passport_number" defaultValue={details.passport_number || ""} onChange={handleChange} className="w-full p-2 rounded border" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Passport Expiry:</label>
                  <input type="date" name="passport_expiry" defaultValue={details.passport_expiry || ""} onChange={handleChange} className="w-full p-2 rounded border" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">ID Expiry:</label>
                  <input type="date" name="id_expiry" defaultValue={details.id_expiry || ""} onChange={handleChange} className="w-full p-2 rounded border" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Visa Expiry:</label>
                  <input type="date" name="visa_expiry" defaultValue={details.visa_expiry || ""} onChange={handleChange} className="w-full p-2 rounded border" />
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Labour Card Picture:</label>
                  <input type="file" name="labour_card_picture" accept="image/*" onChange={handleFileChange} className="w-full p-2 rounded border" />
                  {details.labour_card_picture && (
                    <img src={API_BASE + details.labour_card_picture} alt="Labour Card" style={{ maxWidth: 200 }} className="mt-2" />
                  )}
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Passport Picture:</label>
                  <input type="file" name="passport_picture" accept="image/*" onChange={handleFileChange} className="w-full p-2 rounded border" />
                  {details.passport_picture && (
                    <img src={API_BASE + details.passport_picture} alt="Passport" style={{ maxWidth: 200 }} className="mt-2" />
                  )}
                </div>
                <div className="mb-2">
                  <label className="block font-semibold">Emirates ID Picture:</label>
                  <input type="file" name="emirates_id_picture" accept="image/*" onChange={handleFileChange} className="w-full p-2 rounded border" />
                  {details.emirates_id_picture && (
                    <img src={API_BASE + details.emirates_id_picture} alt="Emirates ID" style={{ maxWidth: 200 }} className="mt-2" />
                  )}
                </div>
                <button type="submit" className="btn btn-primary mt-2">Update Details</button>
              </form>
              {notification && <div className="notification-bar mt-4 text-yellow-700 font-semibold">{notification}</div>}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
