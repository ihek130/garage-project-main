// Migration script to update employee_task table: rename Title column to Vehicle
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

async function migrateEmployeeTaskTable() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Starting employee_task table migration...');
      
      // Step 1: Check if Vehicle column already exists
      db.all("PRAGMA table_info(employee_task)", (err, columns) => {
        if (err) {
          console.error('Error checking table structure:', err);
          reject(err);
          return;
        }
        
        const hasVehicle = columns.some(col => col.name === 'Vehicle');
        const hasTitle = columns.some(col => col.name === 'Title');
        
        if (hasVehicle && !hasTitle) {
          console.log('Migration already completed. Vehicle column exists, Title column does not exist.');
          resolve();
          return;
        }
        
        if (hasVehicle && hasTitle) {
          console.log('Both Vehicle and Title columns exist. Copying Title data to Vehicle...');
          // Copy Title data to Vehicle column
          db.run("UPDATE employee_task SET Vehicle = Title WHERE Vehicle IS NULL OR Vehicle = ''", (err) => {
            if (err) {
              console.error('Error copying data:', err);
              reject(err);
              return;
            }
            console.log('Data copied from Title to Vehicle successfully');
            resolve();
          });
          return;
        }
        
        if (!hasVehicle && hasTitle) {
          console.log('Adding Vehicle column and copying data from Title...');
          
          // Step 2: Add Vehicle column
          db.run("ALTER TABLE employee_task ADD COLUMN Vehicle TEXT", (err) => {
            if (err) {
              console.error('Error adding Vehicle column:', err);
              reject(err);
              return;
            }
            console.log('Vehicle column added successfully');
            
            // Step 3: Copy data from Title to Vehicle
            db.run("UPDATE employee_task SET Vehicle = Title", (err) => {
              if (err) {
                console.error('Error copying data from Title to Vehicle:', err);
                reject(err);
                return;
              }
              console.log('Data copied from Title to Vehicle successfully');
              
              // Note: SQLite doesn't support DROP COLUMN easily, so we keep both columns
              // The backend will prioritize Vehicle over Title
              console.log('Migration completed. Both Title and Vehicle columns exist.');
              console.log('Backend has been updated to use Vehicle field.');
              resolve();
            });
          });
        }
      });
    });
  });
}

// Run migration
migrateEmployeeTaskTable()
  .then(() => {
    console.log('Migration completed successfully');
    db.close();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  });
