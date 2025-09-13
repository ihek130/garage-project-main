// Migration script to add SOA (Statement of Account) fields to employee_task table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to database for SOA fields migration');
});

// Function to generate timesheet number format: TS-001-2025
function generateTimesheetNumber(id, date) {
    const year = new Date(date).getFullYear();
    const paddedId = String(id).padStart(3, '0');
    return `TS-${paddedId}-${year}`;
}

// Function to generate bill number format: BILL-001-2025  
function generateBillNumber(id, date) {
    const year = new Date(date).getFullYear();
    const paddedId = String(id).padStart(3, '0');
    return `BILL-${paddedId}-${year}`;
}

async function addSOAFields() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('🚀 Starting SOA fields migration...');
            
            // Step 1: Check current table structure
            db.all("PRAGMA table_info(employee_task)", (err, columns) => {
                if (err) {
                    console.error('Error checking table structure:', err);
                    reject(err);
                    return;
                }
                
                const hasTimesheetNo = columns.some(col => col.name === 'timesheet_no');
                const hasBillNumber = columns.some(col => col.name === 'bill_number');
                
                console.log(`Current columns: ${columns.map(col => col.name).join(', ')}`);
                console.log(`Timesheet No. exists: ${hasTimesheetNo}`);
                console.log(`Bill Number exists: ${hasBillNumber}`);
                
                // Step 2: Add timesheet_no column if it doesn't exist
                if (!hasTimesheetNo) {
                    console.log('📝 Adding timesheet_no column...');
                    db.run("ALTER TABLE employee_task ADD COLUMN timesheet_no TEXT", (err) => {
                        if (err) {
                            console.error('Error adding timesheet_no column:', err);
                            reject(err);
                            return;
                        }
                        console.log('✅ timesheet_no column added successfully');
                        
                        // Step 3: Add bill_number column if it doesn't exist
                        if (!hasBillNumber) {
                            console.log('📝 Adding bill_number column...');
                            db.run("ALTER TABLE employee_task ADD COLUMN bill_number TEXT", (err) => {
                                if (err) {
                                    console.error('Error adding bill_number column:', err);
                                    reject(err);
                                    return;
                                }
                                console.log('✅ bill_number column added successfully');
                                
                                // Step 4: Populate existing records with generated numbers
                                populateExistingRecords(resolve, reject);
                            });
                        } else {
                            // Step 4: Populate existing records (bill_number exists, only timesheet_no was added)
                            populateExistingRecords(resolve, reject);
                        }
                    });
                } else if (!hasBillNumber) {
                    // Only bill_number needs to be added
                    console.log('📝 Adding bill_number column...');
                    db.run("ALTER TABLE employee_task ADD COLUMN bill_number TEXT", (err) => {
                        if (err) {
                            console.error('Error adding bill_number column:', err);
                            reject(err);
                            return;
                        }
                        console.log('✅ bill_number column added successfully');
                        
                        // Step 4: Populate existing records
                        populateExistingRecords(resolve, reject);
                    });
                } else {
                    // Both columns exist, just populate missing data
                    console.log('📝 Both columns exist, checking for missing data...');
                    populateExistingRecords(resolve, reject);
                }
            });
        });
    });
}

function populateExistingRecords(resolve, reject) {
    console.log('📋 Populating existing records with generated numbers...');
    
    // Get all records that need timesheet_no or bill_number
    db.all(`
        SELECT id, Date 
        FROM employee_task 
        WHERE timesheet_no IS NULL OR bill_number IS NULL OR timesheet_no = '' OR bill_number = ''
        ORDER BY id ASC
    `, (err, rows) => {
        if (err) {
            console.error('Error fetching records for population:', err);
            reject(err);
            return;
        }
        
        if (rows.length === 0) {
            console.log('✅ No records need updating');
            resolve();
            return;
        }
        
        console.log(`📊 Found ${rows.length} records to update`);
        
        let completed = 0;
        const total = rows.length;
        
        rows.forEach(row => {
            const timesheetNo = generateTimesheetNumber(row.id, row.Date || new Date().toISOString());
            const billNumber = generateBillNumber(row.id, row.Date || new Date().toISOString());
            
            db.run(`
                UPDATE employee_task 
                SET timesheet_no = COALESCE(NULLIF(timesheet_no, ''), ?),
                    bill_number = COALESCE(NULLIF(bill_number, ''), ?)
                WHERE id = ?
            `, [timesheetNo, billNumber, row.id], (updateErr) => {
                if (updateErr) {
                    console.error(`Error updating record ${row.id}:`, updateErr);
                } else {
                    console.log(`✅ Updated record ${row.id}: ${timesheetNo}, ${billNumber}`);
                }
                
                completed++;
                if (completed === total) {
                    console.log('🎉 SOA fields migration completed successfully!');
                    console.log(`📊 Updated ${total} records with timesheet and bill numbers`);
                    resolve();
                }
            });
        });
    });
}

// Run migration
console.log('🎯 Starting SOA (Statement of Account) migration...');
addSOAFields()
    .then(() => {
        console.log('✅ Migration completed successfully');
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('📝 Database connection closed');
            }
            process.exit(0);
        });
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        db.close();
        process.exit(1);
    });

module.exports = { addSOAFields, generateTimesheetNumber, generateBillNumber };