const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/diagnostics', authenticate, requireRole('Admin'), controller.getDiagnostics);
router.get('/database/summary', authenticate, requireRole('Admin'), controller.getDbSummary);
router.get('/database/:table', authenticate, requireRole('Admin'), controller.getDbTableData);

module.exports = router;
