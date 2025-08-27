import React, { useState, useEffect } from "react";
import Layout from "../Layout";
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Report() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly'); // daily, weekly, monthly, yearly
  const [summaryData, setSummaryData] = useState({
    income: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    expenses: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    profit: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    tasks: { total: 0, completed: 0, pending: 0 },
    employees: { total: 0, active: 0 }
  });

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      // Fetch income data
      const incomeRes = await axios.get(`${API_BASE}/api/income/get/E-income`);
      const incomeData = incomeRes.data?.rows || [];
      
      // Fetch expenses data
      const expensesRes = await axios.get(`${API_BASE}/api/expense/get/Eexpenses`);
      const expensesData = expensesRes.data?.rows || [];
      
      // Fetch employee tasks data
      const tasksRes = await axios.get(`${API_BASE}/api/employeetask/get/Etask`);
      const tasksData = tasksRes.data || []; // Direct array, not wrapped in rows
      
      // Fetch employees data
      const employeesRes = await axios.get(`${API_BASE}/api/employee/get/employees`);
      const employeesData = employeesRes.data?.rows || [];

      // Calculate summary data
      const today = new Date();
      const summary = calculateSummary(incomeData, expensesData, tasksData, employeesData, today);
      setSummaryData(summary);
      
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (income, expenses, tasks, employees, today) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    const filterByDate = (data, days) => {
      const cutoffDate = new Date(today.getTime() - days);
      return data.filter(item => {
        const itemDate = new Date(item.date || item.created_at || item.Date);
        return itemDate >= cutoffDate;
      });
    };

    const sumAmount = (data) => data.reduce((sum, item) => sum + (parseFloat(item.amount || item.Amount || 0)), 0);

    // Calculate income for different periods
    const incomeDaily = sumAmount(filterByDate(income, oneDay));
    const incomeWeekly = sumAmount(filterByDate(income, oneWeek));
    const incomeMonthly = sumAmount(filterByDate(income, oneMonth));
    const incomeYearly = sumAmount(filterByDate(income, oneYear));

    // Calculate expenses for different periods
    const expensesDaily = sumAmount(filterByDate(expenses, oneDay));
    const expensesWeekly = sumAmount(filterByDate(expenses, oneWeek));
    const expensesMonthly = sumAmount(filterByDate(expenses, oneMonth));
    const expensesYearly = sumAmount(filterByDate(expenses, oneYear));

    return {
      income: {
        daily: incomeDaily,
        weekly: incomeWeekly,
        monthly: incomeMonthly,
        yearly: incomeYearly
      },
      expenses: {
        daily: expensesDaily,
        weekly: expensesWeekly,
        monthly: expensesMonthly,
        yearly: expensesYearly
      },
      profit: {
        daily: incomeDaily - expensesDaily,
        weekly: incomeWeekly - expensesWeekly,
        monthly: incomeMonthly - expensesMonthly,
        yearly: incomeYearly - expensesYearly
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => (t.status || t.Status || '').toLowerCase() === 'completed').length,
        pending: tasks.filter(t => (t.status || t.Status || '').toLowerCase() === 'pending').length
      },
      employees: {
        total: employees.length,
        active: employees.length // Assuming all employees are active
      }
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };

  return (
    <Layout title="Reports & Analytics">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Business Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive overview of income, expenses, and profit across different time periods</p>
        </div>

        {/* Period Selector */}
        <div className="mb-6">
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`btn ${
                  period === p 
                    ? 'btn-primary' 
                    : 'btn-secondary'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-lg text-gray-600">Loading reports...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Income Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summaryData.income[period])}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{period} total</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summaryData.expenses[period])}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{period} total</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Profit Card */}
            <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${summaryData.profit[period] >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold ${summaryData.profit[period] >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(summaryData.profit[period])}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{period} total</p>
                </div>
                <div className={`p-3 rounded-full ${summaryData.profit[period] >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                  <svg className={`w-6 h-6 ${summaryData.profit[period] >= 0 ? 'text-blue-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tasks Overview */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasks Overview</p>
                  <p className="text-2xl font-bold text-purple-600">{summaryData.tasks.total}</p>
                  <p className="text-sm text-gray-500">
                    {summaryData.tasks.completed} completed, {summaryData.tasks.pending} pending
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Employees Overview */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Employees</p>
                  <p className="text-2xl font-bold text-indigo-600">{summaryData.employees.total}</p>
                  <p className="text-sm text-gray-500">Active employees</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Summary Table */}
            <div className="md:col-span-2 lg:col-span-3 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Summary - All Periods</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((periodKey) => (
                      <tr key={periodKey} className={period === periodKey ? 'bg-orange-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {periodKey}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(summaryData.income[periodKey])}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {formatCurrency(summaryData.expenses[periodKey])}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          summaryData.profit[periodKey] >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {formatCurrency(summaryData.profit[periodKey])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Report;
