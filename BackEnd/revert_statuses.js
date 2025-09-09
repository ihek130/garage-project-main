// Revert status changes back to original values
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Reverting status changes back to original...');
  
  db.run('UPDATE employee_task SET Status = "pending" WHERE Status = "bill pending"', (err) => {
    if (err) console.error(err);
    else console.log('✅ Reverted "bill pending" back to "pending"');
  });
  
  db.run('UPDATE employee_task SET Status = "in-progress" WHERE Status = "bill in-progress"', (err) => {
    if (err) console.error(err);
    else console.log('✅ Reverted "bill in-progress" back to "in-progress"');
  });
  
  db.run('UPDATE employee_task SET Status = "done" WHERE Status = "bill done"', (err) => {
    if (err) console.error(err);
    else console.log('✅ Reverted "bill done" back to "done"');
  });
  
  db.run('UPDATE employee_task SET Status = "completed" WHERE Status = "bill completed"', (err) => {
    if (err) console.error(err);
    else console.log('✅ Reverted "bill completed" back to "completed"');
  });
  
  setTimeout(() => {
    db.all("SELECT Status, COUNT(*) as count FROM employee_task GROUP BY Status", (err, rows) => {
      if (!err && rows) {
        console.log('\nCurrent status distribution:');
        rows.forEach(row => {
          console.log(`  ${row.Status}: ${row.count} tasks`);
        });
      }
      db.close();
      console.log('\n🎉 Status reversion completed!');
    });
  }, 1000);
});
