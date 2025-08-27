// BackEnd/Config/db.js
// SQLite3 connector
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('⚠️  SQLite connect failed:', err.message);
  } else {
    console.log('✅ SQLite connected to database.db');
  }
});

module.exports = db;
