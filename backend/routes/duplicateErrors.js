const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/data/logs - Get all logs with optional filtering
router.get('/logs', auth, async (req, res) => {
  try {
    const { level, file, search, limit = 1000, offset = 0 } = req.query;
    
    const result = logger.getLogs({ level, file, search, limit, offset });
    
    res.json({ 
      errors: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to read logs', 'logs-api', { error: error.message });
    res.status(500).json({ error: 'Failed to read logs', details: error.message });
  }
});

// GET /api/data/logs/stats - Get logs statistics
router.get('/logs/stats', auth, async (req, res) => {
  try {
    const stats = logger.getLogStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get logs statistics', 'logs-api', { error: error.message });
    res.status(500).json({ error: 'Failed to get logs statistics', details: error.message });
  }
});

// DELETE /api/data/logs/clear - Clear all logs
router.delete('/logs/clear', auth, async (req, res) => {
  try {
    const success = logger.clearLogs();
    
    if (success) {
      logger.info('Logs cleared by user', 'logs-api', { userId: req.user.id });
      res.json({ message: 'Logs cleared successfully' });
    } else {
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  } catch (error) {
    logger.error('Failed to clear logs', 'logs-api', { error: error.message });
    res.status(500).json({ error: 'Failed to clear logs', details: error.message });
  }
});

// GET /api/data/duplicate-errors - Legacy endpoint for backward compatibility
router.get('/duplicate-errors', auth, async (req, res) => {
  try {
    const result = logger.getLogs({ limit: 1000 });
    res.json({ errors: result.logs });
  } catch (error) {
    logger.error('Failed to read duplicate errors', 'logs-api', { error: error.message });
    res.status(500).json({ error: 'Failed to read logs', details: error.message });
  }
});

module.exports = router;
