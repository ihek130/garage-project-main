const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Create customers table
const createCustomersTable = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  vehicle TEXT,
  description TEXT,
  date DATE,
  contact TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.run(createCustomersTable, (err) => {
  if (err) {
    console.error('Error creating customers table:', err);
  } else {
    console.log('✅ Customers table created/verified successfully');
    
    // Check table structure
    db.all('PRAGMA table_info(customers)', (err, columns) => {
      if (err) {
        console.error('Error checking columns:', err);
      } else {
        console.log('✅ Customers table structure:');
        columns.forEach(col => console.log(`- ${col.name} (${col.type})`));
      }
      db.close();
    });
  }
});
