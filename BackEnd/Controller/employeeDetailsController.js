// BackEnd/Controller/employeeDetailsController.js
const path = require('path');
const fs = require('fs');
const db = require('../Config/db');

// Helper: Save uploaded file and return relative path
function saveEmployeeFile(file, type) {
  try {
    console.log(`💾 Saving ${type} file:`, file.originalname);
    const uploadDir = path.join(__dirname, '../assets/uploads/employees');
    
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Creating upload directory:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const ext = path.extname(file.originalname);
    const filename = `${type}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    
    console.log('📝 Writing file to:', filePath);
    fs.writeFileSync(filePath, file.buffer);
    
    const relativePath = `/assets/uploads/employees/${filename}`;
    console.log('✅ File saved successfully:', relativePath);
    return relativePath;
  } catch (error) {
    console.error('❌ Error saving file:', error);
    throw error;
  }
}

// Update employee details (including images)
exports.updateEmployeeDetails = async (req, res) => {
  try {
    console.log('📝 Update employee details called');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    const { id } = req.body;
    const {
      name,
      passport_number,
      passport_expiry,
      id_expiry,
      visa_expiry
    } = req.body;

    if (!id) {
      console.error('❌ Missing employee ID');
      return res.status(400).json({ Message: 'Employee ID is required' });
    }

    let labour_card_picture = null;
    let passport_picture = null;
    let emirates_id_picture = null;

    if (req.files) {
      console.log('📁 Processing file uploads...');
      if (req.files.labour_card_picture) {
        console.log('Uploading labour card picture');
        labour_card_picture = saveEmployeeFile(req.files.labour_card_picture[0], 'labour_card');
      }
      if (req.files.passport_picture) {
        console.log('Uploading passport picture');
        passport_picture = saveEmployeeFile(req.files.passport_picture[0], 'passport');
      }
      if (req.files.emirates_id_picture) {
        console.log('Uploading emirates ID picture');
        emirates_id_picture = saveEmployeeFile(req.files.emirates_id_picture[0], 'emirates_id');
      }
    }
    const sql = `UPDATE employees SET
      name = COALESCE(?, name),
      passport_number = COALESCE(?, passport_number),
      passport_expiry = COALESCE(?, passport_expiry),
      id_expiry = COALESCE(?, id_expiry),
      visa_expiry = COALESCE(?, visa_expiry),
      labour_card_picture = COALESCE(?, labour_card_picture),
      passport_picture = COALESCE(?, passport_picture),
      emirates_id_picture = COALESCE(?, emirates_id_picture)
      WHERE id = ?`;

    const params = [
      name,
      passport_number,
      passport_expiry,
      id_expiry,
      visa_expiry,
      labour_card_picture,
      passport_picture,
      emirates_id_picture,
      id
    ];
    
    console.log('🔍 SQL Query:', sql);
    console.log('🔍 Parameters:', params);
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Database error updating employee details:', err);
        console.error('SQL:', sql);
        console.error('Params:', params);
        return res.status(500).json({ Message: 'Database error: ' + err.message });
      }
      
      console.log('✅ Employee details updated successfully');
      console.log('Changes made:', this.changes);
      res.json({ 
        Message: 'Employee details updated', 
        id: id,
        changes: this.changes,
        files: {
          labour_card_picture,
          passport_picture,
          emirates_id_picture
        }
      });
    });
  } catch (e) {
    console.error('updateEmployeeDetails error:', e);
    res.status(500).json({ Message: 'Internal Server Error' });
  }
};

// Get employee details by ID
exports.getEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM employees WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error fetching employee details:', err);
        return res.status(500).json({ Message: 'Internal Server Error' });
      }
      res.json(row);
    });
  } catch (e) {
    console.error('getEmployeeDetails error:', e);
    res.status(500).json({ Message: 'Internal Server Error' });
  }
};
