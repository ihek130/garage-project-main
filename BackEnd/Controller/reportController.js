// BackEnd/Controller/reportController.js
const db = require("../Config/db");

/**
 * GET /reports/dashboard
 * Get automated financial dashboard with income, expenses, and profit calculations
 */
const getDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = "";
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = " WHERE date BETWEEN ? AND ?";
      params = [startDate, endDate];
    }
    
    // Get total income
    db.all(`SELECT SUM(amount) as total_income FROM income${dateFilter}`, params, (err, incomeResult) => {
      if (err) {
        console.error("Income calculation error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
      const totalIncome = incomeResult[0]?.total_income || 0;
      
      // Get total expenses
      db.all(`SELECT SUM(amount) as total_expenses FROM expenses${dateFilter}`, params, (err, expenseResult) => {
        if (err) {
          console.error("Expense calculation error:", err);
          return res.status(500).json({ Message: "Internal Server Error" });
        }
        
        const totalExpenses = expenseResult[0]?.total_expenses || 0;
        
        // Get pending income (invoices not yet paid)
        db.all(`SELECT SUM(pending) as pending_income FROM invoice${dateFilter}`, params, (err, pendingResult) => {
          if (err) {
            console.error("Pending calculation error:", err);
            return res.status(500).json({ Message: "Internal Server Error" });
          }
          
          const pendingIncome = pendingResult[0]?.pending_income || 0;
          
          // Get completed tasks summary
          db.all(`SELECT 
                    COUNT(*) as completed_tasks,
                    SUM(Hours) as total_hours,
                    SUM(Amount) as tasks_value
                   FROM employee_task 
                   WHERE Status = 'completed'${dateFilter ? ' AND' + dateFilter.replace('WHERE', '') : ''}`, 
                   params, (err, tasksResult) => {
            if (err) {
              console.error("Tasks calculation error:", err);
              return res.status(500).json({ Message: "Internal Server Error" });
            }
            
            const tasksData = tasksResult[0] || {};
            
            // Calculate metrics
            const currentProfit = totalIncome - totalExpenses;
            const expectedProfit = (totalIncome + pendingIncome) - totalExpenses;
            const profitMargin = totalIncome > 0 ? (currentProfit / totalIncome) * 100 : 0;
            
            res.json({
              financial: {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                currentProfit: currentProfit,
                pendingIncome: pendingIncome,
                expectedProfit: expectedProfit,
                profitMargin: profitMargin.toFixed(2)
              },
              tasks: {
                completedTasks: tasksData.completed_tasks || 0,
                totalHours: tasksData.total_hours || 0,
                tasksValue: tasksData.tasks_value || 0
              },
              dateRange: {
                startDate: startDate || "All time",
                endDate: endDate || "All time"
              }
            });
          });
        });
      });
    });
  } catch (e) {
    console.error("getDashboard exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * GET /reports/company-performance
 * Get performance metrics by company
 */
const getCompanyPerformance = async (req, res) => {
  try {
    const query = `
      SELECT 
        Company,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(Hours) as total_hours,
        SUM(Amount) as total_revenue,
        AVG(Rate) as avg_rate
      FROM employee_task 
      WHERE Company IS NOT NULL AND Company != ''
      GROUP BY Company
      ORDER BY total_revenue DESC
    `;
    
    db.all(query, (err, companies) => {
      if (err) {
        console.error("Company performance error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
      const companiesWithMetrics = companies.map(company => ({
        ...company,
        completion_rate: company.total_tasks > 0 ? 
          ((company.completed_tasks / company.total_tasks) * 100).toFixed(2) : 0,
        avg_rate: parseFloat(company.avg_rate || 0).toFixed(2)
      }));
      
      res.json(companiesWithMetrics);
    });
  } catch (e) {
    console.error("getCompanyPerformance exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

/**
 * GET /reports/monthly-trends
 * Get monthly income and expense trends
 */
const getMonthlyTrends = async (req, res) => {
  try {
    const query = `
      SELECT 
        strftime('%Y-%m', date) as month,
        'income' as type,
        SUM(amount) as amount
      FROM income
      WHERE date IS NOT NULL
      GROUP BY strftime('%Y-%m', date)
      
      UNION ALL
      
      SELECT 
        strftime('%Y-%m', date) as month,
        'expense' as type,
        SUM(amount) as amount
      FROM expenses
      WHERE date IS NOT NULL
      GROUP BY strftime('%Y-%m', date)
      
      ORDER BY month DESC
    `;
    
    db.all(query, (err, trends) => {
      if (err) {
        console.error("Monthly trends error:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      
      // Group by month
      const monthlyData = {};
      trends.forEach(item => {
        if (!monthlyData[item.month]) {
          monthlyData[item.month] = { month: item.month, income: 0, expense: 0 };
        }
        monthlyData[item.month][item.type] = item.amount;
      });
      
      // Calculate profit for each month
      const monthlyTrends = Object.values(monthlyData).map(month => ({
        ...month,
        profit: month.income - month.expense,
        profitMargin: month.income > 0 ? ((month.profit / month.income) * 100).toFixed(2) : 0
      }));
      
      res.json(monthlyTrends);
    });
  } catch (e) {
    console.error("getMonthlyTrends exception:", e);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

module.exports = {
  getDashboard,
  getCompanyPerformance,
  getMonthlyTrends
};
