const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

console.log('🔍 Database Investigation Report\n');

// Check which database files exist
const databases = ['database.db', 'garage.sqlite', 'assets/database.db'];

databases.forEach(dbPath => {
    console.log(`📁 Checking: ${dbPath}`);
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`   ✅ EXISTS - Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
        
        // Check tables in this database
        const db = new sqlite3.Database(dbPath);
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.log(`   ❌ Error reading tables: ${err.message}`);
            } else {
                console.log(`   📋 Tables: ${tables.map(t => t.name).join(', ')}`);
                
                // Check if employee_task table has data
                if (tables.find(t => t.name === 'employee_task')) {
                    db.get("SELECT COUNT(*) as count FROM employee_task", (err, result) => {
                        if (!err) {
                            console.log(`   📊 employee_task records: ${result.count}`);
                        }
                        db.close();
                    });
                } else {
                    db.close();
                }
            }
        });
    } else {
        console.log(`   ❌ NOT FOUND`);
    }
    console.log('');
});

// Check what the main server is configured to use
setTimeout(() => {
    console.log('\n🔧 Checking server configuration...');
    
    // Check Config/db.js
    try {
        const dbConfig = require('./Config/db.js');
        console.log('📋 Config/db.js database path configured');
    } catch (e) {
        console.log('❌ Config/db.js not found or has error');
    }
    
    // Check what Server.js uses
    const serverFile = fs.readFileSync('./Server.js', 'utf8');
    if (serverFile.includes('database.db')) {
        console.log('🎯 Server.js references: database.db');
    }
    if (serverFile.includes('garage.sqlite')) {
        console.log('🎯 Server.js references: garage.sqlite');
    }
    
}, 2000);