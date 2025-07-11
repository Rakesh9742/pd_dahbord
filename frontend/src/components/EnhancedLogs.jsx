import React, { useEffect, useState, useCallback } from 'react';
import './EnhancedLogs.css';

const EnhancedLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState('all');
  const [logLevel, setLogLevel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const token = localStorage.getItem('token');

  // Parse log entry to extract structured data
  const parseLogEntry = (logEntry) => {
    // Ensure logEntry is a string
    if (typeof logEntry !== 'string') {
      return {
        timestamp: new Date().toISOString(),
        fileName: 'unknown',
        message: String(logEntry),
        fullMessage: String(logEntry),
        level: 'info',
        isSummary: false
      };
    }

    const timestampMatch = logEntry.match(/\[(.*?)\]/);
    const fileMatch = logEntry.match(/\[(.*?)\]/g);
    
    if (timestampMatch && fileMatch && fileMatch.length > 1) {
      const fullMessage = logEntry;
      const message = logEntry.replace(/\[.*?\]\s*\[.*?\]\s*/, '');
      const isSummary = message.includes('SUMMARY:');
      
      return {
        timestamp: timestampMatch[1],
        fileName: fileMatch[1].replace(/[\[\]]/g, ''),
        message: message,
        fullMessage: fullMessage,
        level: logEntry.toLowerCase().includes('error') ? 'error' : 
               logEntry.toLowerCase().includes('warning') ? 'warning' : 'info',
        isSummary: isSummary
      };
    }
    
    return {
      timestamp: new Date().toISOString(),
      fileName: 'unknown',
      message: logEntry,
      fullMessage: logEntry,
      level: 'info',
      isSummary: false
    };
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/data/logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
      
      setLogs(data.errors || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchLogs]);

  // Filter logs based on search, file, and level
  useEffect(() => {
    let filtered = logs.map(parseLogEntry);

    // Filter by file
    if (selectedFile !== 'all') {
      filtered = filtered.filter(log => log.fileName === selectedFile);
    }

    // Filter by log level
    if (logLevel !== 'all') {
      filtered = filtered.filter(log => log.level === logLevel);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, selectedFile, logLevel, searchTerm]);

  // Get unique file names
  const parsedLogs = logs.map(parseLogEntry);
  const files = ['all', ...Array.from(new Set(parsedLogs.map(log => log.fileName)))];

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,File,Level,Message',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.fileName}","${log.level}","${log.message.replace(/"/g, '""')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/data/logs/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setLogs([]);
        setFilteredLogs([]);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to clear logs');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getLogLevelClass = (level) => {
    switch (level) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'info': return 'log-info';
      default: return 'log-info';
    }
  };

  return (
    <div className="enhanced-logs">
      <div className="logs-header">
        <h2>System Logs</h2>
        <div className="logs-controls">
          <button 
            className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            🔄 {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button className="export-btn" onClick={exportLogs}>
            📥 Export CSV
          </button>
          <button className="clear-btn" onClick={clearLogs}>
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className="logs-filters">
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>File:</label>
          <select 
            value={selectedFile} 
            onChange={(e) => setSelectedFile(e.target.value)}
            className="filter-select"
          >
            {files.map(file => (
              <option key={file} value={file}>
                {file === 'all' ? 'All Files' : file}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Level:</label>
          <select 
            value={logLevel} 
            onChange={(e) => setLogLevel(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading logs...</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={fetchLogs} className="retry-btn">Retry</button>
        </div>
      )}

      {!loading && filteredLogs.length === 0 && (
        <div className="no-logs">
          {logs.length === 0 ? 'No logs found.' : 'No logs match the current filters.'}
        </div>
      )}

      {!loading && filteredLogs.length > 0 && (
        <>
          <div className="logs-stats">
            <span>Showing {currentLogs.length} of {filteredLogs.length} logs</span>
            <span>Total logs: {logs.length}</span>
          </div>

          <div className="logs-container">
            {currentLogs.map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className={`log-entry ${getLogLevelClass(log.level)}`}>
                <div className="log-header">
                  <span className="log-level-icon">{getLogLevelIcon(log.level)}</span>
                  <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="log-file">{log.fileName}</span>
                  <span className="log-level-badge">{log.level.toUpperCase()}</span>
                </div>
                <div className="log-message">{log.message}</div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedLogs; 