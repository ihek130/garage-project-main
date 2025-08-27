
const express = require('express')
const db = require('../Config/db')
const exportexcel = require('../utils/excelexport')

exports.postdata = async (req, res) => {
    console.log('POST /employeesalary/post/Esalary endpoint called');
    const data = {
        name: req.body.name,
        job_title: req.body.job_title,
        date: req.body.date,
        overtime_hours: req.body.overtime_hours || 0,
        overtime_rate: 10, // Fixed at 10 AED/hour
        overtime_amount: Number(req.body.overtime_hours || 0) * 10,
        advance_taken: req.body.advance_taken || 0,
        total_salary: req.body.total_salary || 0, // This is the base salary from frontend
        salary_status: req.body.salary_status,
    }

    console.log('Received salary data:', req.body);
    console.log('Parsed for DB:', data);

    try {
        const { name, job_title, date, overtime_hours, overtime_rate, overtime_amount, advance_taken, total_salary, salary_status } = data;

        if (!name || !job_title || !date || !salary_status) {
            console.error('Missing required field:', { name, job_title, date, salary_status });
            return res.status(400).json({ Message: "All required fields must be provided" });
        }

        const query = 'INSERT INTO employeesalaary (name, job_title, date, overtime_hours, overtime_rate, overtime_amount, advance_taken, total_salary, salary_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.run(query, [name, job_title, date, overtime_hours, overtime_rate, overtime_amount, advance_taken, total_salary, salary_status], function(err) {
            if (err) {
                console.error('Error inserting salary data:', err);
                return res.status(500).json({ Message: "Internal Server Error" });
            }
            
            // Calculate final salary for response (base + overtime - advance)
            const finalSalary = Number(total_salary) + Number(overtime_amount) - Number(advance_taken);
            
            // Automatically create expense entry for salary payment
            const salaryData = {
                id: this.lastID,
                name: name,
                job_title: job_title,
                total_salary: total_salary,
                overtime_amount: overtime_amount,
                advance_taken: advance_taken,
                finalSalary: finalSalary,
                date: date,
                salary_status: salary_status
            };
            
            // Create expense entry (don't wait for it to complete)
            createExpenseFromSalary(salaryData).catch(err => {
                console.error('Error creating expense entry:', err);
            });
            
            res.json({ 
                Message: "Salary data saved successfully",
                salaryId: this.lastID,
                totalSalary: total_salary,
                overtimeAmount: overtime_amount,
                finalSalary: finalSalary,
                expenseAutoCreated: true
            });
        });
    } catch (error) {
        console.error('Error in postdata:', error);
        res.status(500).json({ Message: "Internal Server Error" });
    }
};

exports.addAdvance = async (req, res) => {
    try {
        const { employeeId, advanceAmount, date, reason } = req.body;
        
        if (!employeeId || !advanceAmount) {
            return res.status(400).json({ Message: "Employee ID and advance amount are required" });
        }

        // Get current salary record
        const getSalaryQuery = "SELECT * FROM employeesalaary WHERE id = ?";
        db.get(getSalaryQuery, [employeeId], (err, row) => {
            if (err) {
                console.error('Error getting salary record:', err);
                return res.status(500).json({ Message: "Error retrieving salary record" });
            }
            
            if (!row) {
                return res.status(404).json({ Message: "Employee salary record not found" });
            }

            // Calculate new values
            const newAdvanceTotal = Number(row.advance_taken) + Number(advanceAmount);
            // Calculate final salary = base_salary + overtime_amount - total_advance
            const finalSalary = Number(row.total_salary) + Number(row.overtime_amount || 0) - newAdvanceTotal;

            // Update the salary record
            const updateQuery = "UPDATE employeesalaary SET advance_taken = ? WHERE id = ?";
            db.run(updateQuery, [newAdvanceTotal, employeeId], function(updateErr) {
                if (updateErr) {
                    console.error('Error updating salary record:', updateErr);
                    return res.status(500).json({ Message: "Error updating salary record" });
                }

                // Automatically create expense entry for advance payment
                const advanceData = {
                    employeeId: employeeId,
                    employeeName: row.name,
                    jobTitle: row.job_title,
                    advanceAmount: advanceAmount,
                    date: date,
                    reason: reason
                };
                
                // Create expense entry (don't wait for it to complete)
                createExpenseFromAdvance(advanceData).catch(err => {
                    console.error('Error creating advance expense entry:', err);
                });

                res.json({
                    Message: "Advance added successfully",
                    newAdvanceTotal,
                    finalSalary,
                    baseSalary: row.total_salary,
                    overtimeAmount: row.overtime_amount || 0,
                    expenseAutoCreated: true
                });
            });
        });
        
    } catch (error) {
        console.error('Error in addAdvance:', error);
        res.status(500).json({ Message: "Internal Server Error" });
    }
};

exports.getcusterexcel = async (req, res) => {
    var userid = req.params.id;
    db.all('SELECT * FROM employeesalaary WHERE id = ?', [userid], (err, rows) => {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        exportexcel(res, rows, 'employeesallary.xlsx');
    });
};  

exports.getdata = async (req, res) => {
    db.all('SELECT * FROM employeesalaary', (err, rows) => {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        res.json({ rows });
    });
};

exports.deletedata = async (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM employeesalaary WHERE `id` = ?', [id], function(err) {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        res.json({ 'Message': 'Deleted successfully' });
    });
};
    
exports.updatedata = async (req, res) => {
    const id = req.params.id;
    const { name, job_title, overtime_hours, advance_taken, date, salary_status, total_salary } = req.body;

    try {
        // Calculate overtime amount
        const overtime_rate = 10; // Fixed at 10 AED/hour
        const overtime_amount = Number(overtime_hours || 0) * overtime_rate;
        
        // total_salary is the base salary (passed from frontend)
        // Don't recalculate it - use the value from the form
        const baseSalary = Number(total_salary || 0);

        const query = `
            UPDATE employeesalaary
            SET name = ?, job_title = ?, overtime_hours = ?, overtime_rate = ?, overtime_amount = ?, advance_taken = ?, total_salary = ?, date = ?, salary_status = ?
            WHERE id = ?
        `;

        db.run(query, [name, job_title, overtime_hours || 0, overtime_rate, overtime_amount, advance_taken || 0, baseSalary, date, salary_status, id], function(err) {
            if (err) {
                console.error('Error executing query', err);
                return res.status(500).json({ "Message": "Internal Server Error" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ "Message": "Salary record not found" });
            }

            // Calculate final salary for response (base + overtime - advance)
            const finalSalary = baseSalary + overtime_amount - Number(advance_taken || 0);

            res.json({
                'Message': 'Updated successfully',
                'totalSalary': baseSalary,
                'overtimeAmount': overtime_amount,
                'finalSalary': finalSalary
            });
        });
    } catch (error) {
        console.error('Error in updatedata:', error);
        res.status(500).json({ Message: "Internal Server Error" });
    }
};

// Helper function to create expense entry for salary payment
const createSalaryExpense = (employeeData, callback) => {
    const finalSalary = Number(employeeData.total_salary) + Number(employeeData.overtime_amount || 0) - Number(employeeData.advance_taken || 0);
    const description = `Salary payment for ${employeeData.name} - Base: AED ${employeeData.total_salary}, Overtime: AED ${employeeData.overtime_amount || 0}, Advance: AED ${employeeData.advance_taken || 0}`;
    
    const expenseQuery = `
        INSERT INTO expenses (amount, description, date, source_type, source_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(expenseQuery, [
        finalSalary,
        description,
        employeeData.date,
        'employee_salary',
        employeeData.id || null
    ], callback);
};

// Helper function to create expense entry for advance payment
const createAdvanceExpense = (employeeName, advanceAmount, date, salaryId, callback) => {
    const description = `Advance payment to ${employeeName} - AED ${advanceAmount}`;
    
    const expenseQuery = `
        INSERT INTO expenses (amount, description, date, source_type, source_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(expenseQuery, [
        advanceAmount,
        description,
        date,
        'employee_advance',
        salaryId
    ], callback);
};

// Helper function to create expense entry from salary payment
const createExpenseFromSalary = async (salaryData) => {
    try {
        const expenseData = {
            name: `Salary - ${salaryData.name}`,
            vehicle: salaryData.job_title || 'N/A',
            description: `Monthly salary payment for ${salaryData.name} (${salaryData.job_title}) - Base: AED ${salaryData.total_salary}, Overtime: AED ${salaryData.overtime_amount}, Advance: AED ${salaryData.advance_taken}`,
            date: salaryData.date,
            amount: salaryData.finalSalary,
            payment_status: salaryData.salary_status,
            source_type: 'employee_salary',
            source_id: salaryData.id
        };

        const query = `
            INSERT INTO expenses (name, vehicle, description, date, amount, payment_status, source_type, source_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            expenseData.name,
            expenseData.vehicle,
            expenseData.description,
            expenseData.date,
            expenseData.amount,
            expenseData.payment_status,
            expenseData.source_type,
            expenseData.source_id
        ], function(err) {
            if (err) {
                console.error('Error creating expense entry for salary:', err);
            } else {
                console.log(`✅ Auto-created expense entry: ${expenseData.name} - AED ${expenseData.amount}`);
            }
        });
    } catch (error) {
        console.error('Error in createExpenseFromSalary:', error);
    }
};

// Helper function to create expense entry from advance payment
const createExpenseFromAdvance = async (advanceData) => {
    try {
        const expenseData = {
            name: `Advance - ${advanceData.employeeName}`,
            vehicle: advanceData.jobTitle || 'N/A',
            description: `Advance payment for ${advanceData.employeeName} (${advanceData.jobTitle}) - ${advanceData.reason || 'Advance payment'}`,
            date: advanceData.date,
            amount: advanceData.advanceAmount,
            payment_status: 'cash',
            source_type: 'employee_advance',
            source_id: advanceData.employeeId
        };

        const query = `
            INSERT INTO expenses (name, vehicle, description, date, amount, payment_status, source_type, source_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            expenseData.name,
            expenseData.vehicle,
            expenseData.description,
            expenseData.date,
            expenseData.amount,
            expenseData.payment_status,
            expenseData.source_type,
            expenseData.source_id
        ], function(err) {
            if (err) {
                console.error('Error creating expense entry for advance:', err);
            } else {
                console.log(`✅ Auto-created expense entry: ${expenseData.name} - AED ${expenseData.amount}`);
            }
        });
    } catch (error) {
        console.error('Error in createExpenseFromAdvance:', error);
    }
};
    