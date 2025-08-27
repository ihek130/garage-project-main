const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding overtime columns to employeesalaary table...');

db.serialize(() => {
    console.log('✅ SQLite connected to database.db');
    
    // Add overtime columns to the table
    const addColumnsQueries = [
        'ALTER TABLE employeesalaary ADD COLUMN overtime_hours REAL DEFAULT 0',
        'ALTER TABLE employeesalaary ADD COLUMN overtime_rate REAL DEFAULT 10',
        'ALTER TABLE employeesalaary ADD COLUMN overtime_amount REAL DEFAULT 0',
        'ALTER TABLE employeesalaary ADD COLUMN regular_hours REAL DEFAULT 0',
        'ALTER TABLE employeesalaary ADD COLUMN hourly_rate REAL DEFAULT 0'
    ];
    
    let completedQueries = 0;
    const totalQueries = addColumnsQueries.length;
    
    addColumnsQueries.forEach((query, index) => {
        db.run(query, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error(`❌ Error adding column ${index + 1}:`, err.message);
            } else if (!err) {
                console.log(`✅ Successfully added column ${index + 1}`);
            } else {
                console.log(`ℹ️ Column ${index + 1} already exists`);
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) {
                // Show current table structure
                db.all('PRAGMA table_info(employeesalaary)', (err, columns) => {
                    if (err) {
                        console.error('❌ Error getting table info:', err);
                    } else {
                        console.log('\nCurrent employeesalaary table columns:');
                        columns.forEach(col => {
                            console.log(`- ${col.name} (${col.type})`);
                        });
                    }
                    
                    db.close((closeErr) => {
                        if (closeErr) {
                            console.error('❌ Error closing database:', closeErr);
                        } else {
                            console.log('\n✅ Database connection closed');
                            console.log('✅ Overtime columns migration completed!');
                        }
                    });
                });
            }
        });
    });
});
