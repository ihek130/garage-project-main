import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../Pages/images/logo.jpeg";
import Notification from "../Pages/images/Notification.png";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { saveAs } from "file-saver";
import Navigation from "./Navigation";
import { MdDelete } from "react-icons/md";
import { FaRegEdit } from "react-icons/fa";
import Modal from "../Modal";

function Employeetask() {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [jobTitles, setJobTitles] = useState([null]);
  const [dates, setDates] = useState([new Date()]);
  const [totalSalaries, setTotalSalaries] = useState([0]); // Changed from salaries to totalSalaries
  const [advancesTaken, setAdvancesTaken] = useState([0]); // New for advance tracking
  const [finalSalaries, setFinalSalaries] = useState([0]); // New for calculated final salary
  const [salaryStatuses, setSalaryStatuses] = useState([null]);
  const [names, setNames] = useState([""]);
  
  // New overtime-related state
  const [overtimeHours, setOvertimeHours] = useState([0]);
  const [overtimeAmounts, setOvertimeAmounts] = useState([0]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [formData, setFormData] = useState({});

  const [alljobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);

  // New state for filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleDropdown = (index) => {
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  const handleDropdownChange = (value, index, type) => {
    switch (type) {
      case "jobTitle":
        const newJobTitles = [...jobTitles];
        newJobTitles[index] = value;
        setJobTitles(newJobTitles);
        break;
      case "salaryStatus":
        const newStatuses = [...salaryStatuses];
        newStatuses[index] = value;
        setSalaryStatuses(newStatuses);
        break;
      default:
        break;
    }
    setDropdownOpen(null);
  };

  const downloadExcel = (id) => {
    axios
      .get(`http://localhost:5000/employeesalary/getexcel/${id}`, {
        responseType: "blob",
      })
      .then((response) => {
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(blob, "data.xlsx");
      })
      .catch((error) => {
        console.error("There was an error downloading the Excel file!", error);
      });
  };

  const handleDateChange = (date, index) => {
    const newDates = [...dates];
    newDates[index] = date;
    setDates(newDates);
  };

  const handleSubmit = () => {
    // Calculate overtime amount
    const overtimeAmount = Number(overtimeHours[0] || 0) * 10;
    
    // Only send the first row's values for single salary creation
    const payload = {
      name: names[0],
      job_title: jobTitles[0],
      date: dates[0],
      overtime_hours: overtimeHours[0] || 0,
      overtime_rate: 10, // Fixed at 10 AED/hour
      overtime_amount: overtimeAmount,
      advance_taken: advancesTaken[0] || 0,
      total_salary: totalSalaries[0] || 0, // This is the base salary
      salary_status: salaryStatuses[0],
    };

    console.log('Submitting new salary data:', payload);

    fetch("http://localhost:5000/employeesalary/post/Esalary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Salary data submitted successfully:", data);
        if (data.finalSalary !== undefined) {
          alert(`Salary saved!\nBase Salary: AED ${data.totalSalary}\nOvertime: AED ${data.overtimeAmount}\nFinal Salary: AED ${data.finalSalary.toFixed(2)}`);
        } else {
          // Fallback calculation for display
          const finalSalary = Number(totalSalaries[0] || 0) + overtimeAmount - Number(advancesTaken[0] || 0);
          alert(`Salary saved! Final salary: AED ${finalSalary.toFixed(2)}`);
        }
        alldata();
        // Reset form
        setNames([""]);
        setJobTitles([null]);
        setDates([new Date()]);
        setOvertimeHours([0]);
        setOvertimeAmounts([0]);
        setTotalSalaries([0]);
        setAdvancesTaken([0]);
        setSalaryStatuses([null]);
      })
      .catch((error) => {
        console.error("Error submitting salary data:", error);
        alert("Error saving salary data");
      });
  };

  const handleAdvancePayment = async (employeeId, currentAdvance, currentTotal) => {
    const advanceAmount = prompt("Enter advance amount:");
    if (!advanceAmount || isNaN(advanceAmount)) {
      alert("Please enter a valid advance amount");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/employeesalary/add-advance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId,
          advanceAmount: Number(advanceAmount),
          date: new Date().toISOString().split('T')[0],
          reason: "Manual advance payment"
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Advance added successfully!\nBase Salary: AED ${result.baseSalary}\nOvertime: AED ${result.overtimeAmount}\nTotal Advance: AED ${result.newAdvanceTotal}\nFinal Salary: AED ${result.finalSalary}`);
        alldata(); // Refresh the data
      } else {
        alert(result.Message || "Error adding advance");
      }
    } catch (error) {
      console.error("Error adding advance:", error);
      alert("Error adding advance payment");
    }
  };

  const alldata = () => {
    fetch("http://localhost:5000/employeesalary/get/Esalary")
      .then((response) => response.json())
      .then((data) => {
        setAllJobs(data.rows);
        setFilteredJobs(data.rows);
        if (data) {
          setNames(data.name || [""]);
          setJobTitles(data.job_title || [null]);
          setDates(data.date || [new Date()]);
          setOvertimeHours(data.overtime_hours || [0]);
          setOvertimeAmounts(data.overtime_amount || [0]);
          setTotalSalaries(data.total_salary || [0]);
          setAdvancesTaken(data.advance_taken || [0]);
          setSalaryStatuses(data.salary_status || [null]);
        }
      })
      .catch((error) => console.error("Error fetching salary data:", error));
  };

  useEffect(() => {
    alldata();
  }, []);

  // New effect for filtering
  useEffect(() => {
    let filtered = alljobs;

    // Date filtering
    if (startDate && endDate) {
      filtered = filtered.filter((job) => {
        const jobDate = new Date(job.date);
        return jobDate >= startDate && jobDate <= endDate;
      });
    }

    // Search filtering
    if (searchQuery) {
      filtered = filtered.filter((job) =>
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.job_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  }, [alljobs, startDate, endDate, searchQuery]);

  const handleEdit = (customer) => {
    setCurrentEmployee(customer);
    setFormData(customer);
    setEditModalOpen(true);
  };

  const handleDelete = (customer) => {
    setCurrentEmployee(customer);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await fetch(
        `http://localhost:5000/employeesalary/delete/${currentEmployee.id}`,
        {
          method: "DELETE",
        }
      );
      setDeleteModalOpen(false);
      alldata();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmitChange = async (e) => {
    e.preventDefault();

    try {
      console.log('Submitting updated salary data:', formData);
      
      const response = await fetch(
        `http://localhost:5000/employeesalary/update/${currentEmployee.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();
      console.log('Update response:', result);

      if (response.ok) {
        alert(`Salary updated successfully!\nBase Salary: AED ${result.totalSalary}\nOvertime: AED ${result.overtimeAmount}\nFinal Salary: AED ${result.finalSalary}`);
        setEditModalOpen(false);
        alldata();
      } else {
        alert(result.Message || "Error updating salary");
      }
    } catch (error) {
      console.error("Error updating customer data:", error);
      alert("Error updating salary data");
    }
  };

  return (
    <div className="bg-gray-100 h-screen flex">
      <aside className="w-64 bg-white text-white flex-shrink-0 fixed h-full">
        <div className="p-6">
          <img className="w-24 h-24 text-white p-2" src={Logo} alt="Logo" />
          <Navigation />
        </div>
      </aside>
      <div className="flex-1 flex flex-col ml-64">
        <header className="bg-white shadow p-7 flex items-center">
          <h2 className="text-xl font-bold text-[#3d3d3d] flex-1">
            Employee Salary
          </h2>
          <div className="flex-1 flex justify-center ml-">
            <div className="filters flex">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="w-1/1 px-3 py-1 border rounded shadow-sm text-xs mx-4"
                placeholderText="Start Date"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="w-1/1 px-3 py-1 border rounded shadow-sm text-xs mx-4"
                placeholderText="End Date"
              />
            </div>
            <input
              type="text"
              placeholder="Search by Name or Job Title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-1/1 px-3 py-1 border rounded shadow-sm text-xs"
            />
          </div>
          <div className="w-8 h-8 cursor-pointer hover:red-300">
            <img src={Notification} alt="icon" />
          </div>
          <button
            onClick={handleSubmit}
            className="text-[#FFFF] bg-[#ea8732] ml-9 mr-9 border-0 py-1 px-2 w-28 focus:outline-none hover:bg-gray-200 rounded font-semibold text-sm"
          >
            Submit
          </button>
        </header>
        <div className="flex-1 p-6 flex justify-center overflow-y-auto">
          <div className="overflow-x-auto w-full max-w-4xl">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="py-3 px-16 bg-gray-200 text-[#3d3d3d] text-left">
                    Name
                  </th>
                  <th className="py-3 px-16 bg-gray-200 text-[#3d3d3d] text-center">
                    Job Title
                  </th>
                  <th className="py-3 px-10 bg-gray-200 text-[#3d3d3d] text-center">
                    Date
                  </th>
                  <th className="py-3 px-4 bg-gray-200 text-[#3d3d3d] text-center">
                    Overtime Hours
                  </th>
                  <th className="py-3 px-4 bg-gray-200 text-[#3d3d3d] text-center">
                    Overtime Amount
                  </th>
                  <th className="py-3 px-4 bg-gray-200 text-[#3d3d3d] text-center">
                    Advance Taken
                  </th>
                  <th className="py-3 px-4 bg-gray-200 text-[#3d3d3d] text-center">
                    Total Salary
                  </th>
                  <th className="py-3 px-4 bg-gray-200 text-[#3d3d3d] text-center">
                    Final Salary
                  </th>
                  <th className="py-3 px-12 bg-gray-200 text-[#3d3d3d] text-center">
                    Salary Status
                  </th>
                  <th className="py-3 px-7 bg-gray-200 text-[#3d3d3d] text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {names.map((name, index) => (
                  <tr key={index} className="text-[#3d3d3d] border-t">
                    <td className="py-3 px-4 text-center text-xs">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          const newNames = [...names];
                          newNames[index] = e.target.value;
                          setNames(newNames);
                        }}
                        className="w-full py-1 px-2 border rounded"
                        placeholder="Enter Name"
                      />
                    </td>
                    <td className="py-3 px-4 text-left text-xs">
                      <div className="relative inline-block">
                        <button
                          className="text-[#ea8732] bg-[#fef4eb] hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-[#ffd7b5] font-medium rounded-full text-xs px-4 py-1.5 inline-flex items-center"
                          type="button"
                          onClick={() => toggleDropdown(index)}
                        >
                          {jobTitles[index] || "Choose Job Title"}
                          <svg
                            className="w-2.5 h-2.5 ml-3"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 10 6"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="m1 1 4 4 4-4"
                            />
                          </svg>
                        </button>
                        {dropdownOpen === index && (
                          <div className="absolute mt-2 bg-white border border-gray-300 rounded shadow-lg">
                            <ul className="list-none m-0 p-0">
                              {[
                                "Crane operator",
                                "Forklift operator",
                                "Boom loader operator",
                                "Mechanic",
                                "Manager",
                                "Accountant",
                              ].map((title, i) => (
                                <li
                                  key={i}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() =>
                                    handleDropdownChange(
                                      title,
                                      index,
                                      "jobTitle"
                                    )
                                  }
                                >
                                  {title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-10 text-center text-xs">
                      <DatePicker
                        selected={dates[index]}
                        onChange={(date) => handleDateChange(date, index)}
                        className="w-full py-1 px-2 border rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <input
                        type="number"
                        value={overtimeHours[index] || ""}
                        onChange={(e) => {
                          const newOvertimeHours = [...overtimeHours];
                          newOvertimeHours[index] = e.target.value;
                          setOvertimeHours(newOvertimeHours);
                          // Auto-calculate overtime amount
                          const overtimeAmount = Number(e.target.value || 0) * 10;
                          const newOvertimeAmounts = [...overtimeAmounts];
                          newOvertimeAmounts[index] = overtimeAmount;
                          setOvertimeAmounts(newOvertimeAmounts);
                        }}
                        className="w-full py-1 px-2 border rounded"
                        placeholder="Overtime Hours"
                      />
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <div className="bg-blue-50 p-2 rounded font-semibold text-blue-700">
                        AED {(Number(overtimeHours[index] || 0) * 10).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <input
                        type="number"
                        value={advancesTaken[index] || ""}
                        onChange={(e) => {
                          const newAdvances = [...advancesTaken];
                          newAdvances[index] = e.target.value;
                          setAdvancesTaken(newAdvances);
                        }}
                        className="w-full py-1 px-2 border rounded"
                        placeholder="Advance"
                      />
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <input
                        type="number"
                        value={totalSalaries[index] || ""}
                        onChange={(e) => {
                          const newTotalSalaries = [...totalSalaries];
                          newTotalSalaries[index] = e.target.value;
                          setTotalSalaries(newTotalSalaries);
                        }}
                        className="w-full py-1 px-2 border rounded"
                        placeholder="Base Salary"
                      />
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <div className="bg-green-50 p-2 rounded font-semibold text-green-700">
                        AED {(
                          Number(totalSalaries[index] || 0) + 
                          (Number(overtimeHours[index] || 0) * 10) - 
                          Number(advancesTaken[index] || 0)
                        ).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <div className="relative inline-block">
                        <button
                          className="text-[#ea8732] bg-[#fef4eb] hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-[#ffd7b5] font-medium rounded-full text-xs px-4 py-1.5 inline-flex items-center"
                          type="button"
                          onClick={() => toggleDropdown(index + 100)}
                        >
                          {salaryStatuses[index] || "Choose Status"}
                          <svg
                            className="w-2.5 h-2.5 ml-3"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 10 6"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="m1 1 4 4 4-4"
                            />
                          </svg>
                        </button>
                        {dropdownOpen === index + 100 && (
                          <div className="absolute mt-2 bg-white border border-gray-300 rounded shadow-lg">
                            <ul className="list-none m-0 p-0">
                              {["online", "cash"].map((status, i) => (
                                <li
                                  key={i}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() =>
                                    handleDropdownChange(
                                      status,
                                      index,
                                      "salaryStatus"
                                    )
                                  }
                                >
                                  {status}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredJobs.map((job, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-3 px-6 text-left text-xs">{job.name}</td>
                    <td className="py-3 px-6 text-center text-xs">
                      {job.job_title}
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      {job.date}
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-semibold">
                        {job.overtime_hours || 0} hrs
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                        AED {Number(job.overtime_amount || (Number(job.overtime_hours || 0) * 10)).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">
                        AED {Number(job.advance_taken || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                        AED {Number(job.total_salary || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                        AED {Number(
                          (Number(job.total_salary || 0) + Number(job.overtime_amount || (Number(job.overtime_hours || 0) * 10)) - Number(job.advance_taken || 0))
                        ).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {job.salary_status}
                      </span>
                    </td>
                    <td className=" text-center text-xs">
                      <button
                        onClick={() => handleEdit(job)}
                        className="text-blue-500  hover:text-blue-700"
                        title="Edit Salary"
                      >
                        <FaRegEdit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleAdvancePayment(job.id, job.advance_taken, job.total_salary || job.salary)}
                        className="text-green-500 hover:text-green-700 ml-2"
                        title="Add Advance"
                      >
                        💰
                      </button>
                      <button
                        onClick={() => handleDelete(job)}
                        className="text-black-500 hover:text-red-700 ml-2"
                        title="Delete"
                      >
                        <MdDelete className="h-5 w-6" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Empty rows */}
                {Array.from({ length: 20 - filteredJobs.length }).map((_, index) => (
                  <tr key={index + filteredJobs.length} className="border-t">
                    <td className="py-3 px-6 text-left text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                    <td className="py-3 px-6 text-center text-xs"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editModalOpen && (
        <Modal show={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <div className="h-auto w-auto">
            <h2 className="text-lg font-bold">Edit Employee Salary</h2>
            <form onSubmit={handleSubmitChange}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block p-2 h-8 w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Job Title
                  </label>
                  <select
                    name="job_title"
                    value={formData.job_title}
                    required
                    onChange={handleChange}
                    className="mt-1 block h-8  w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Job Title</option>
                    <option value="Crane operator">Crane operator</option>
                    <option value="Forklift operator">Forklift operator</option>
                    <option value="Boom loader operator">
                      Boom loader operator
                    </option>
                    <option value="Mechanic">Mechanic</option>
                    <option value="Manager">Manager</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    name="overtime_hours"
                    value={formData.overtime_hours || 0}
                    onChange={handleChange}
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Overtime Amount (Auto-calculated: 10 AED/hour)
                  </label>
                  <input
                    type="text"
                    value={`AED ${(Number(formData.overtime_hours || 0) * 10).toFixed(2)}`}
                    disabled
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Advance Taken
                  </label>
                  <input
                    type="number"
                    name="advance_taken"
                    value={formData.advance_taken || 0}
                    onChange={handleChange}
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Salary (Base Salary)
                  </label>
                  <input
                    type="number"
                    name="total_salary"
                    value={formData.total_salary || 0}
                    onChange={handleChange}
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Final Salary (Total + Overtime - Advance)
                  </label>
                  <input
                    type="text"
                    value={`AED ${(
                      Number(formData.total_salary || 0) + 
                      (Number(formData.overtime_hours || 0) * 10) - 
                      Number(formData.advance_taken || 0)
                    ).toFixed(2)}`}
                    disabled
                    className="mt-1 block h-8 p-2 w-full border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Salary Status
                  </label>
                  <select
                    name="salary_status"
                    value={formData.salary_status}
                    required
                    onChange={handleChange}
                    className="mt-1 block h-8  w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Salary Status</option>
                    <option value="online">online</option>
                    <option value="cash">cash</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded mt-4"
              >
                Save Changes
              </button>
            </form>
          </div>
        </Modal>
      )}
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <h2 className="text-lg font-bold">Confirm Delete</h2>
        <p>Are you sure you want to delete this employee record?</p>
        <button
          onClick={handleConfirmDelete}
          className="bg-red-500 text-white py-2  px-4 rounded mt-4"
        >
          Yes, Delete
        </button>
        <button
          onClick={() => setDeleteModalOpen(false)}
          className="bg-gray-500 text-white py-2 px-4 rounded mt-4 ml-2"
        >
          Cancel
        </button>
      </Modal>
    </div>
  );
}

export default Employeetask;