import React, { useState, useEffect } from "react";
import Navigation from "../Navigation";

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function Report() {
  const [dashboard, setDashboard] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    expectedProfit: 0,
    profitMargin: 0
  });
  const [companies, setCompanies] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      // Load dashboard
      const dashboardRes = await fetch(`${API_BASE}/api/reports/dashboard`);
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setDashboard(dashboardData);
      }

      // Load company performance
      const companiesRes = await fetch(`${API_BASE}/api/reports/companies`);
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
      }

      // Load monthly trends
      const trendsRes = await fetch(`${API_BASE}/api/reports/trends`);
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setMonthlyTrends(trendsData);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Financial Reports</h1>

        {/* Financial Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Income</h3>
            <p className="text-3xl font-bold text-green-600">${dashboard.totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-600">${dashboard.totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Net Profit</h3>
            <p className={`text-3xl font-bold ${dashboard.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${dashboard.netProfit.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Profit Margin</h3>
            <p className={`text-3xl font-bold ${dashboard.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dashboard.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Company Performance */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Company Performance</h2>
          {companies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Company</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Tasks</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Hours</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Revenue</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-900">{company.company}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{company.total_tasks}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{company.total_hours}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${company.total_revenue.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${company.avg_rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No company data available</p>
          )}
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Monthly Trends</h2>
          {monthlyTrends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Month</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Income</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Expenses</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Profit</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrends.map((trend, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-900">{trend.month}</td>
                      <td className="px-4 py-2 text-sm text-green-600">${trend.income.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-red-600">${trend.expenses.toFixed(2)}</td>
                      <td className={`px-4 py-2 text-sm ${trend.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trend.profit.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 text-sm ${trend.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No monthly data available</p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={loadReports}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Reports
          </button>
        </div>
      </div>
    </div>
  );
}
