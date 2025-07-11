const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.logPath = path.join(this.logDir, 'logs.log');
    this.errorLogPath = path.join(this.logDir, 'errors.log');
    this.infoLogPath = path.join(this.logDir, 'info.log');
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Format timestamp
  formatTimestamp() {
    return new Date().toISOString();
  }

  // Write log entry
  writeLog(level, message, fileName = 'system', additionalData = {}) {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] [${fileName}] [${level.toUpperCase()}] ${message}`;
    
    // Write to main log file
    fs.appendFileSync(this.logPath, logEntry + '\n');
    
    // Write to specific log files based on level
    if (level === 'error') {
      fs.appendFileSync(this.errorLogPath, logEntry + '\n');
    } else if (level === 'info') {
      fs.appendFileSync(this.infoLogPath, logEntry + '\n');
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMessage = `${level.toUpperCase()}: ${message}`;
      switch (level) {
        case 'error':
          console.error(consoleMessage);
          break;
        case 'warning':
          console.warn(consoleMessage);
          break;
        case 'info':
          console.info(consoleMessage);
          break;
        default:
          console.log(consoleMessage);
      }
    }
  }

  // Log methods
  error(message, fileName = 'system', data = {}) {
    this.writeLog('error', message, fileName, data);
  }

  warning(message, fileName = 'system', data = {}) {
    this.writeLog('warning', message, fileName, data);
  }

  info(message, fileName = 'system', data = {}) {
    this.writeLog('info', message, fileName, data);
  }

  // Log duplicate errors specifically
  logDuplicateError(row, fileName) {
    const message = `Duplicate entry: project=${row.project}, block=${row.block_name}, experiment=${row.experiment}, run_end_time=${row.run_end_time}`;
    this.error(message, fileName);
  }

  // Log successful operations
  logSuccess(operation, details, fileName = 'system') {
    const message = `SUCCESS: ${operation} - ${JSON.stringify(details)}`;
    this.info(message, fileName);
  }

  // Log user-friendly summary messages
  logSummary(action, summary, fileName = 'system') {
    const message = `SUMMARY: ${action} - ${summary}`;
    this.info(message, fileName);
  }

  // Log file processing events
  logFileProcessing(fileName, action, details = {}) {
    const message = `File Processing: ${action} - ${JSON.stringify(details)}`;
    this.info(message, fileName);
  }

  // Log CSV processing events
  logCSVProcessing(fileName, action, details = {}) {
    const message = `CSV Processing: ${action} - ${JSON.stringify(details)}`;
    this.info(message, fileName);
  }

  // Log database operations
  logDatabaseOperation(operation, table, details = {}) {
    const message = `Database ${operation}: ${table} - ${JSON.stringify(details)}`;
    this.info(message, 'database');
  }

  // Log authentication events
  logAuthEvent(event, userId, details = {}) {
    const message = `Auth ${event}: user=${userId} - ${JSON.stringify(details)}`;
    this.info(message, 'auth');
  }

  // Get log statistics
  getLogStats() {
    try {
      let logs = [];
      
      // Read from main log file
      if (fs.existsSync(this.logPath)) {
        const logContent = fs.readFileSync(this.logPath, 'utf-8');
        logs = logs.concat(logContent.split('\n').filter(Boolean));
      }
      
      // Read from duplicate errors log file
      const duplicateErrorsPath = path.join(this.logDir, 'duplicate_errors.log');
      if (fs.existsSync(duplicateErrorsPath)) {
        const duplicateContent = fs.readFileSync(duplicateErrorsPath, 'utf-8');
        const duplicateLogs = duplicateContent.split('\n').filter(Boolean);
        // Add timestamp to duplicate logs if they don't have one
        const formattedDuplicateLogs = duplicateLogs.map(log => {
          if (log.match(/^\[.*?\]/)) {
            return log; // Already has timestamp
          } else {
            return `[${this.formatTimestamp()}] [duplicate_errors.log] [ERROR] ${log}`;
          }
        });
        logs = logs.concat(formattedDuplicateLogs);
      }

      // Count by level
      const errorCount = logs.filter(log => log.includes('[ERROR]')).length;
      const warningCount = logs.filter(log => log.includes('[WARNING]')).length;
      const infoCount = logs.filter(log => log.includes('[INFO]')).length;

      // Extract unique files
      const files = Array.from(new Set(logs.map(log => {
        const match = log.match(/\[(.*?)\] \[(.*?)\]/);
        return match ? match[2] : null;
      }).filter(Boolean)));

      // Get recent activity (last 10 logs)
      const recentActivity = logs.slice(-10).map(log => {
        const timestampMatch = log.match(/\[(.*?)\]/);
        const fileMatch = log.match(/\[(.*?)\]/g);
        const levelMatch = log.match(/\[(.*?)\]/g);
        
        return {
          timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
          file: fileMatch && fileMatch.length > 1 ? fileMatch[1].replace(/[\[\]]/g, '') : 'unknown',
          level: levelMatch && levelMatch.length > 2 ? levelMatch[2].replace(/[\[\]]/g, '').toLowerCase() : 'info',
          message: log.replace(/\[.*?\]\s*\[.*?\]\s*\[.*?\]\s*/, '')
        };
      });

      return {
        totalLogs: logs.length,
        errorCount,
        warningCount,
        infoCount,
        files,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return {
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        files: [],
        recentActivity: []
      };
    }
  }

  // Clear all logs
  clearLogs() {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.writeFileSync(this.logPath, '');
      }
      if (fs.existsSync(this.errorLogPath)) {
        fs.writeFileSync(this.errorLogPath, '');
      }
      if (fs.existsSync(this.infoLogPath)) {
        fs.writeFileSync(this.infoLogPath, '');
      }
      // Clear duplicate errors log
      const duplicateErrorsPath = path.join(this.logDir, 'duplicate_errors.log');
      if (fs.existsSync(duplicateErrorsPath)) {
        fs.writeFileSync(duplicateErrorsPath, '');
      }
      return true;
    } catch (error) {
      console.error('Error clearing logs:', error);
      return false;
    }
  }

  // Get logs with filtering
  getLogs(filters = {}) {
    try {
      let logs = [];
      
      // Read from main log file
      if (fs.existsSync(this.logPath)) {
        const logContent = fs.readFileSync(this.logPath, 'utf-8');
        logs = logs.concat(logContent.split('\n').filter(Boolean));
      }
      
      // Read from duplicate errors log file
      const duplicateErrorsPath = path.join(this.logDir, 'duplicate_errors.log');
      if (fs.existsSync(duplicateErrorsPath)) {
        const duplicateContent = fs.readFileSync(duplicateErrorsPath, 'utf-8');
        const duplicateLogs = duplicateContent.split('\n').filter(Boolean);
        // Add timestamp to duplicate logs if they don't have one
        const formattedDuplicateLogs = duplicateLogs.map(log => {
          if (log.match(/^\[.*?\]/)) {
            return log; // Already has timestamp
          } else {
            return `[${this.formatTimestamp()}] [duplicate_errors.log] [ERROR] ${log}`;
          }
        });
        logs = logs.concat(formattedDuplicateLogs);
      }

      // Apply filters
      if (filters.level && filters.level !== 'all') {
        logs = logs.filter(log => {
          const logLower = log.toLowerCase();
          return filters.level === 'error' ? logLower.includes('[error]') :
                 filters.level === 'warning' ? logLower.includes('[warning]') :
                 filters.level === 'info' ? logLower.includes('[info]') : true;
        });
      }

      if (filters.file && filters.file !== 'all') {
        logs = logs.filter(log => log.includes(`[${filters.file}]`));
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        logs = logs.filter(log => log.toLowerCase().includes(searchLower));
      }

      // Apply pagination
      const totalCount = logs.length;
      const limit = parseInt(filters.limit) || 1000;
      const offset = parseInt(filters.offset) || 0;
      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      };
    } catch (error) {
      console.error('Error getting logs:', error);
      return { logs: [], pagination: { total: 0, limit: 0, offset: 0, hasMore: false } };
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 