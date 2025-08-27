const db = require('./Config/db');

console.log('🔄 Migrating existing salary and invoice data...');

// Helper function to create expense entry from salary payment
const createExpenseFromSalary = async (salaryData) => {
    try {
        const finalSalary = Number(salaryData.total_salary || 0) + Number(salaryData.overtime_amount || 0) - Number(salaryData.advance_taken || 0);
        const expenseData = {
            name: `Salary - ${salaryData.name}`,
            vehicle: salaryData.job_title || 'N/A',
            description: `Monthly salary payment for ${salaryData.name} (${salaryData.job_title}) - Base: AED ${salaryData.total_salary}, Overtime: AED ${salaryData.overtime_amount}, Advance: AED ${salaryData.advance_taken}`,
            date: salaryData.date,
            amount: finalSalary,
            payment_status: salaryData.salary_status,
            source_type: 'employee_salary',
            source_id: salaryData.id
        };

        const query = `
            INSERT INTO expenses (name, vehicle, description, date, amount, payment_status, source_type, source_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
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
                    reject(err);
                } else {
                    console.log(`✅ Created expense entry: ${expenseData.name} - AED ${expenseData.amount}`);
                    resolve(this.lastID);
                }
            });
        });
    } catch (error) {
        console.error('Error in createExpenseFromSalary:', error);
    }
};

// Helper function to create income entry from invoice
const createIncomeFromInvoice = async (invoice) => {
    try {
        // Only create income if there's an advance payment (meaning payment was received)
        const advanceReceived = Number(invoice.advance || 0);
        if (advanceReceived <= 0) return;

        const incomeData = {
            source: `Payment from ${invoice.customer_name || invoice.company || 'Customer'}`,
            description: `Invoice #${invoice.invoice_no || invoice.id} payment - ${invoice.description || 'Service payment'}`,
            date: invoice.date || new Date().toISOString().split('T')[0],
            amount: advanceReceived,
            status: 'confirmed',
            invoice_id: invoice.id,
            source_type: 'invoice_payment',
            source_id: invoice.id
        };

        const query = `
            INSERT INTO income (source, description, date, amount, status, invoice_id, source_type, source_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
            db.run(query, [
                incomeData.source,
                incomeData.description,
                incomeData.date,
                incomeData.amount,
                incomeData.status,
                incomeData.invoice_id,
                incomeData.source_type,
                incomeData.source_id
            ], function(err) {
                if (err) {
                    console.error('Error creating income entry:', err);
                    reject(err);
                } else {
                    console.log(`✅ Created income entry: ${incomeData.source} - AED ${incomeData.amount}`);
                    resolve(this.lastID);
                }
            });
        });
    } catch (error) {
        console.error('Error in createIncomeFromInvoice:', error);
    }
};

async function migrateData() {
    try {
        // 1. Migrate existing salary entries to expenses
        console.log('\n📊 Processing existing salary entries...');
        const salaries = await new Promise((resolve, reject) => {
            db.all(`
                SELECT s.* FROM employeesalaary s 
                LEFT JOIN expenses e ON e.source_type = 'employee_salary' AND e.source_id = s.id 
                WHERE e.id IS NULL
            `, (err, rows) => {
                err ? reject(err) : resolve(rows);
            });
        });

        console.log(`Found ${salaries.length} salary entries without expense records`);
        
        for (const salary of salaries) {
            await createExpenseFromSalary(salary);
        }

        // 2. Migrate existing invoices with payments to income
        console.log('\n💰 Processing existing invoice payments...');
        const invoices = await new Promise((resolve, reject) => {
            db.all(`
                SELECT i.* FROM invoice i 
                LEFT JOIN income inc ON inc.source_type = 'invoice_payment' AND inc.source_id = i.id 
                WHERE i.advance > 0 AND inc.id IS NULL
            `, (err, rows) => {
                err ? reject(err) : resolve(rows);
            });
        });

        console.log(`Found ${invoices.length} invoices with payments but no income records`);
        
        for (const invoice of invoices) {
            await createIncomeFromInvoice(invoice);
        }

        console.log('\n✅ Migration completed successfully!');
        
        // Show summary
        const expenseCount = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM expenses WHERE source_type IN ('employee_salary', 'employee_advance')`, (err, row) => {
                err ? reject(err) : resolve(row.count);
            });
        });

        const incomeCount = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM income WHERE source_type = 'invoice_payment'`, (err, row) => {
                err ? reject(err) : resolve(row.count);
            });
        });

        console.log(`\n📈 Summary:`);
        console.log(`   - Salary/Advance Expenses: ${expenseCount}`);
        console.log(`   - Invoice Payment Income: ${incomeCount}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrateData();
