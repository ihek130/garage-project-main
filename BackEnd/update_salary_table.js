const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Create the employeesalaary table with enhanced structure
const createTableQuery = `
CREATE TABLE IF NOT EXISTS employeesalaary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  date DATE NOT NULL,
  total_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  advance_taken DECIMAL(10,2) DEFAULT 0,
  final_salary DECIMAL(10,2) DEFAULT 0,
  salary_status TEXT DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('✅ Employee salary table created/updated successfully');
    
    // Check table structure
    db.all('PRAGMA table_info(employeesalaary)', (err, columns) => {
      if (err) {
        console.error('Error checking columns:', err);
      } else {
        console.log('✅ Table structure verified:');
        columns.forEach(col => console.log(`- ${col.name} (${col.type})`));
      }
      db.close();
    });
  }
});
