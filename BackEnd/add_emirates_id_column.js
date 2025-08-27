// BackEnd/add_emirates_id_column.js
// Migration script to add emirates_id_picture column to employees table

const db = require('./Config/db');

console.log('Adding emirates_id_picture column to employees table...');

// Check if column already exists
db.get("PRAGMA table_info(employees)", (err, result) => {
  if (err) {
    console.error('Error checking table structure:', err);
    return;
  }

  // Add the column if it doesn't exist
  db.run("ALTER TABLE employees ADD COLUMN emirates_id_picture TEXT", (err) => {
    if (err) {
      // Column might already exist
      if (err.message.includes('duplicate column name')) {
        console.log('emirates_id_picture column already exists');
      } else {
        console.error('Error adding column:', err);
      }
    } else {
      console.log('Successfully added emirates_id_picture column to employees table');
    }
    
    // Verify the column was added
    db.all("PRAGMA table_info(employees)", (err, columns) => {
      if (err) {
        console.error('Error verifying table structure:', err);
      } else {
        console.log('Current employees table columns:');
        columns.forEach(col => {
          console.log(`- ${col.name} (${col.type})`);
        });
      }
      db.close();
    });
  });
});
