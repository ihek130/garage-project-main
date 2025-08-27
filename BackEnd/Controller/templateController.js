const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../Config/db");

// Ensure templates directory exists
const TEMPLATES_DIR = path.join(__dirname, "..", "assets", "templates");
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Multer configuration for template uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMPLATES_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.originalname.toLowerCase().endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  },
});

// Initialize templates table
async function initTemplatesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS invoice_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );
  `;
  
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Get all templates
exports.getTemplates = async (req, res) => {
  try {
    await initTemplatesTable();
    
    db.all("SELECT * FROM invoice_templates WHERE is_active = 1 ORDER BY uploaded_at DESC", (err, rows) => {
      if (err) {
        console.error("Error fetching templates:", err);
        return res.status(500).json({ Message: "Failed to fetch templates" });
      }
      res.json({ templates: rows || [] });
    });
  } catch (error) {
    console.error("Error in getTemplates:", error);
    res.status(500).json({ Message: "Internal server error" });
  }
};

// Upload new template
exports.uploadTemplate = async (req, res) => {
  try {
    await initTemplatesTable();
    
    const uploadMiddleware = upload.single('file');
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error("Upload error:", err);
        return res.status(400).json({ Message: err.message || "Upload failed" });
      }
      
      if (!req.file) {
        return res.status(400).json({ Message: "No file uploaded" });
      }
      
      const { filename, originalname, path: filePath } = req.file;
      const name = req.body.name || originalname.replace(/\.(docx?)$/i, '');
      
      // Save template info to database
      const sql = `
        INSERT INTO invoice_templates (name, filename, file_path, original_name)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [name, filename, filePath, originalname], function(err) {
        if (err) {
          console.error("Database error:", err);
          // Clean up uploaded file
          fs.unlink(filePath, () => {});
          return res.status(500).json({ Message: "Failed to save template" });
        }
        
        res.json({
          Message: "Template uploaded successfully",
          template: {
            id: this.lastID,
            name,
            filename,
            original_name: originalname
          }
        });
      });
    });
  } catch (error) {
    console.error("Error in uploadTemplate:", error);
    res.status(500).json({ Message: "Internal server error" });
  }
};

// Get template file
exports.getTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    db.get("SELECT * FROM invoice_templates WHERE id = ? AND is_active = 1", [templateId], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ Message: "Database error" });
      }
      
      if (!row) {
        return res.status(404).json({ Message: "Template not found" });
      }
      
      const filePath = row.file_path;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ Message: "Template file not found" });
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${row.original_name}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    });
  } catch (error) {
    console.error("Error in getTemplate:", error);
    res.status(500).json({ Message: "Internal server error" });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    // Get template info first
    db.get("SELECT * FROM invoice_templates WHERE id = ?", [templateId], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ Message: "Database error" });
      }
      
      if (!row) {
        return res.status(404).json({ Message: "Template not found" });
      }
      
      // Mark as inactive instead of actually deleting
      db.run("UPDATE invoice_templates SET is_active = 0 WHERE id = ?", [templateId], function(err) {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ Message: "Failed to delete template" });
        }
        
        res.json({ Message: "Template deleted successfully" });
      });
    });
  } catch (error) {
    console.error("Error in deleteTemplate:", error);
    res.status(500).json({ Message: "Internal server error" });
  }
};

// Render template (placeholder for future implementation)
exports.renderTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    const formData = req.body;
    
    // For now, just return the template file URL
    // In the future, this could be enhanced to actually process the template
    db.get("SELECT * FROM invoice_templates WHERE id = ? AND is_active = 1", [templateId], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ Message: "Database error" });
      }
      
      if (!row) {
        return res.status(404).json({ Message: "Template not found" });
      }
      
      // Return the template file for download/opening
      res.json({
        Message: "Template ready for editing",
        file: {
          url: `/api/templates/download/${templateId}`,
          name: row.original_name,
          id: templateId
        },
        formData
      });
    });
  } catch (error) {
    console.error("Error in renderTemplate:", error);
    res.status(500).json({ Message: "Internal server error" });
  }
};
