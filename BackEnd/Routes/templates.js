const express = require('express');
const router = express.Router();

const {
  getTemplates,
  uploadTemplate,
  getTemplate,
  deleteTemplate,
  renderTemplate
} = require('../Controller/templateController');

// GET /templates - Get all templates
router.get('/', getTemplates);

// POST /templates/upload - Upload new template
router.post('/upload', uploadTemplate);

// GET /templates/download/:id - Download template file
router.get('/download/:id', getTemplate);

// POST /templates/render/:id - Render template with data
router.post('/render/:id', renderTemplate);

// DELETE /templates/:id - Delete template
router.delete('/:id', deleteTemplate);

module.exports = router;
