const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - same as used by the server
const dbPath = path.resolve(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to database for schema updates');
});

// Add source tracking columns to income table
function addIncomeSourceColumns() {
    return new Promise((resolve, reject) => {
        db.run(`
            ALTER TABLE income ADD COLUMN source_type TEXT;
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding source_type to income:', err);
            } else {
                console.log('✅ Added source_type column to income table');
            }
            
            db.run(`
                ALTER TABLE income ADD COLUMN source_id INTEGER;
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding source_id to income:', err);
                    reject(err);
                } else {
                    console.log('✅ Added source_id column to income table');
                    resolve();
                }
            });
        });
    });
}

// Add source tracking columns to expenses table
function addExpenseSourceColumns() {
    return new Promise((resolve, reject) => {
        db.run(`
            ALTER TABLE expenses ADD COLUMN source_type TEXT;
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding source_type to expenses:', err);
            } else {
                console.log('✅ Added source_type column to expenses table');
            }
            
            db.run(`
                ALTER TABLE expenses ADD COLUMN source_id INTEGER;
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding source_id to expenses:', err);
                    reject(err);
                } else {
                    console.log('✅ Added source_id column to expenses table');
                    resolve();
                }
            });
        });
    });
}

// Run the migrations
async function runMigrations() {
    try {
        console.log('🔄 Adding source tracking columns...');
        
        await addIncomeSourceColumns();
        await addExpenseSourceColumns();
        
        console.log('✅ All source tracking columns added successfully!');
        console.log('');
        console.log('📋 Source types that will be used:');
        console.log('   Income sources: invoice_payment');
        console.log('   Expense sources: employee_salary, employee_advance');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}

runMigrations();
