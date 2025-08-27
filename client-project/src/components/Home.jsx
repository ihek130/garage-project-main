import React, { useState } from "react";
import { Link } from "react-router-dom";
import HomeBarChart from "./HomeChart";
import EmployeeDetails from "./Pages/EmployeeDetails";
import Layout from "./Layout";

function Home() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Dashboard Cards with improved styling */}
        <div className="dashboard-card fade-in">
          <Link to="/Employeesalary" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">💰</div>
            <span className="text-base font-semibold">
              Employee Salary
            </span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Employeetask" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">📋</div>
            <span className="text-base font-semibold">
              Employee Task
            </span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <div className="icon">👥</div>
          <button 
            className="text-base font-semibold bg-transparent border-none cursor-pointer"
            onClick={() => setShowDetails((v) => !v)}
            style={{ background: 'transparent', border: 'none' }}
          >
            {showDetails ? "Hide" : "Show"} Employee Details
          </button>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Income" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">📈</div>
            <span className="text-base font-semibold">Income</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Expenses" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">📉</div>
            <span className="text-base font-semibold">Expenses</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Customer" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">🤝</div>
            <span className="text-base font-semibold">Customers</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Vehicle" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">🚗</div>
            <span className="text-base font-semibold">Vehicles</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Invoice" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">🧾</div>
            <span className="text-base font-semibold">Invoice</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Pending" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">⏳</div>
            <span className="text-base font-semibold">Pending</span>
          </Link>
        </div>
        
        <div className="dashboard-card fade-in">
          <Link to="/Report" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon">📊</div>
            <span className="text-base font-semibold">Reports</span>
          </Link>
        </div>
      </div>
      
      {/* Chart Section */}
      <div className="bg-white shadow flex items-center justify-center mt-8 card">
        <HomeBarChart />
      </div>

      {showDetails && <EmployeeDetails />}
    </Layout>
  );
}

export default Home;
