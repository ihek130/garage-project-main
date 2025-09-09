// Migration script to update existing task statuses to use "bill" prefix
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

async function updateTaskStatuses() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Starting task status migration...');
      
      // Status mapping: old status -> new status
      const statusMapping = {
        'pending': 'bill pending',
        'in-progress': 'bill in-progress',
        'completed': 'bill done',
        'done': 'bill done'
      };
      
      let completedUpdates = 0;
      const totalUpdates = Object.keys(statusMapping).length;
      
      // Update each status
      for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
        console.log(`Updating "${oldStatus}" to "${newStatus}"...`);
        
        db.run(
          "UPDATE employee_task SET Status = ? WHERE Status = ?", 
          [newStatus, oldStatus], 
          function(err) {
            if (err) {
              console.error(`Error updating status "${oldStatus}":`, err);
              reject(err);
              return;
            }
            
            console.log(`✅ Updated ${this.changes} records from "${oldStatus}" to "${newStatus}"`);
            completedUpdates++;
            
            if (completedUpdates === totalUpdates) {
              console.log('Status migration completed successfully!');
              
              // Show final status counts
              db.all("SELECT Status, COUNT(*) as count FROM employee_task GROUP BY Status", (err, rows) => {
                if (!err && rows) {
                  console.log('\nFinal status distribution:');
                  rows.forEach(row => {
                    console.log(`  ${row.Status}: ${row.count} tasks`);
                  });
                }
                resolve();
              });
            }
          }
        );
      }
    });
  });
}

// Run migration
updateTaskStatuses()
  .then(() => {
    console.log('\n🎉 Task status migration completed successfully!');
    db.close();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  });
