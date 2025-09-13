const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('🔍 Checking companies in employee_task table...');

db.all('SELECT DISTINCT Company FROM employee_task WHERE Company IS NOT NULL AND Company != ""', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
    } else {
        console.log('📊 Companies found:', rows.length);
        rows.forEach((row, index) => {
            console.log(`${index + 1}. "${row.Company}"`);
        });
    }
    
    // Also check all records to see the data structure
    db.all('SELECT * FROM employee_task LIMIT 5', (err, records) => {
        if (err) {
            console.error('❌ Error fetching records:', err);
        } else {
            console.log('\n📋 Sample records:');
            records.forEach((record, index) => {
                console.log(`Record ${index + 1}:`, {
                    id: record.id,
                    Employee: record.Employee,
                    Company: record.Company,
                    Date: record.Date,
                    Title: record.Title
                });
            });
        }
        db.close();
    });
});