import React, { useEffect, useState, useRef } from 'react';
import './RealTimeLogs.css';

const RealTimeLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logsEndRef = useRef(null);
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    let interval;
    let isMounted = true;

    const fetchLatestLogs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/data/logs?limit=50', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!isMounted) return;
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch logs');
        
        setLogs(data.errors || []);
        setIsConnected(true);
        setError('');
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setIsConnected(false);
        }
      }
    };

    // Initial fetch
    fetchLatestLogs();

    // Set up polling every 2 seconds
    interval = setInterval(fetchLatestLogs, 2000);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [token]);

  const parseLogEntry = (logEntry) => {
    const timestampMatch = logEntry.match(/\[(.*?)\]/);
    const fileMatch = logEntry.match(/\[(.*?)\]/g);
    
    if (timestampMatch && fileMatch && fileMatch.length > 1) {
      return {
        timestamp: timestampMatch[1],
        fileName: fileMatch[1].replace(/[\[\]]/g, ''),
        message: logEntry.replace(/\[.*?\]\s*\[.*?\]\s*/, ''),
        fullMessage: logEntry,
        level: logEntry.toLowerCase().includes('error') ? 'error' : 
               logEntry.toLowerCase().includes('warning') ? 'warning' : 'info'
      };
    }
    
    return {
      timestamp: new Date().toISOString(),
      fileName: 'unknown',
      message: logEntry,
      fullMessage: logEntry,
      level: 'info'
    };
  };

  const filteredLogs = logs
    .map(parseLogEntry)
    .filter(log => {
      // Filter by level
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'info': return 'log-info';
      default: return 'log-info';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

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
    a.download = `realtime_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="realtime-logs">
      <div className="logs-header">
        <div className="header-left">
          <h2>Real-Time Logs</h2>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'}
            </span>
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="filter-controls">
            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
            </select>
            
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="action-controls">
            <button 
              className={`auto-scroll-btn ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            >
              {autoScroll ? '📌' : '📌'}
              {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            </button>
            
            <button className="export-btn" onClick={exportLogs}>
              📥 Export
            </button>
            
            <button className="clear-btn" onClick={clearLogs}>
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            {logs.length === 0 ? 'No logs available.' : 'No logs match the current filters.'}
          </div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className={`log-entry ${getLevelClass(log.level)}`}>
                <div className="log-header">
                  <span className="log-level-icon">{getLevelIcon(log.level)}</span>
                  <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="log-file">{log.fileName}</span>
                  <span className="log-level-badge">{log.level.toUpperCase()}</span>
                </div>
                <div className="log-message">{log.message}</div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <div className="logs-footer">
        <div className="logs-info">
          <span>Showing {filteredLogs.length} of {logs.length} logs</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeLogs; 