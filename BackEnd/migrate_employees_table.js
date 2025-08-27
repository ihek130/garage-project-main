// Run this script once to add new columns to the employees table
const db = require('./Config/db');

const alterSql = `
  ALTER TABLE employees ADD COLUMN passport_number TEXT;
  ALTER TABLE employees ADD COLUMN passport_expiry TEXT;
  ALTER TABLE employees ADD COLUMN id_expiry TEXT;
  ALTER TABLE employees ADD COLUMN visa_expiry TEXT;
  ALTER TABLE employees ADD COLUMN labour_card_picture TEXT;
  ALTER TABLE employees ADD COLUMN passport_picture TEXT;
`;

function runMigration() {
  const statements = alterSql.split(';').map(s => s.trim()).filter(Boolean);
  let promise = Promise.resolve();
  statements.forEach(sql => {
    promise = promise.then(() => new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) return resolve();
          console.error('Migration error:', err.message);
        }
        resolve();
      });
    }));
  });
  promise.then(() => {
    console.log('✅ Employees table migration complete.');
    process.exit(0);
  });
}

runMigration();
