import React, { useEffect, useState, useCallback } from 'react';
import './LogSummary.css';

const LOG_LEVEL_FILTERS = [
  { value: 'errors', label: 'Errors & Warnings' },
  { value: 'info', label: 'Success/Info' },
  { value: 'all', label: 'All' }
];

const SEVERITY_COLORS = {
  error: '#ea5455',
  warning: '#ff9f43',
  info: '#00cfe8',
  success: '#28c76f',
};

const SEVERITY_ICONS = {
  error: '⛔',
  warning: '⚠️',
  info: 'ℹ️',
  success: '✅',
};

const extractFileName = (log) => {
  const fileMatch = log.match(/\[(.*?)\]/g);
  if (fileMatch && fileMatch.length > 1) {
    return fileMatch[1].replace(/\[|\]/g, '');
  }
  return 'Unknown File';
};

const extractSummary = (log) => {
  let msg = log.replace(/^\[.*?\]\s*\[.*?\]\s*/, '');
  msg = msg.replace(/^\[.*?\]\s*/, '');
  const colonIdx = msg.indexOf(':');
  const dashIdx = msg.indexOf('-');
  let endIdx = msg.length;
  if (colonIdx !== -1) endIdx = Math.min(endIdx, colonIdx + 1);
  if (dashIdx !== -1) endIdx = Math.min(endIdx, dashIdx + 1);
  return msg.slice(0, Math.max(endIdx, 20)).trim() || 'Log Entry';
};

const extractLevel = (log) => {
  if (log.toLowerCase().includes('error')) return 'error';
  if (log.toLowerCase().includes('warning')) return 'warning';
  if (log.toLowerCase().includes('success')) return 'success';
  return 'info';
};

const extractTimestamp = (log) => {
  const match = log.match(/\[(.*?)\]/);
  return match ? new Date(match[1]) : null;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const LogSummary = () => {
  const [fileGroups, setFileGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [logLevelFilter, setLogLevelFilter] = useState('errors');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('all');
  const token = localStorage.getItem('token');

  // Group logs by file, then by summary, filtered by logLevelFilter
  const groupLogs = (logs) => {
    const files = {};
    logs.forEach(log => {
      const level = extractLevel(log);
      if (logLevelFilter === 'errors' && level === 'info') return;
      if (logLevelFilter === 'info' && level !== 'info' && level !== 'success') return;
      // 'all' shows everything
      const file = extractFileName(log);
      const summary = extractSummary(log);
      const timestamp = extractTimestamp(log);
      if (!files[file]) files[file] = {};
      if (!files[file][summary]) files[file][summary] = {
        summary,
        level,
        logs: [],
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        count: 0
      };
      files[file][summary].logs.push(log);
      files[file][summary].count++;
      if (!files[file][summary].firstOccurrence || (timestamp && timestamp < files[file][summary].firstOccurrence)) {
        files[file][summary].firstOccurrence = timestamp;
      }
      if (!files[file][summary].lastOccurrence || (timestamp && timestamp > files[file][summary].lastOccurrence)) {
        files[file][summary].lastOccurrence = timestamp;
      }
    });
    // Convert to array for rendering
    return Object.entries(files).map(([file, summaries]) => ({
      file,
      summaries: Object.values(summaries).sort((a, b) => b.count - a.count)
    }));
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
      const logs = data.errors || [];
      setFileGroups(groupLogs(logs));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, logLevelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, fetchLogs]);

  // Filtering
  const filteredFileGroups = fileGroups
    .filter(fg => fileFilter === 'all' || fg.file === fileFilter)
    .map(fg => ({
      ...fg,
      summaries: fg.summaries.filter(summary =>
        summary.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.logs.some(log => log.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }))
    .filter(fg => fg.summaries.length > 0);

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Unique file list for filter
  const allFiles = ['all', ...Array.from(new Set(fileGroups.map(fg => fg.file)))];

  // Add missing clearAllLogs and exportSummaries
  const clearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) return;
    try {
      const response = await fetch('http://localhost:5000/api/data/logs/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setFileGroups([]);
        setSelectedFile(null);
        setSelectedSummary(null);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to clear logs');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const exportSummaries = () => {
    const csvContent = [
      'File,Error Summary,Count,First Occurrence,Last Occurrence,Severity',
      ...fileGroups.flatMap(fileGroup =>
        fileGroup.summaries.map(summary =>
          `"${fileGroup.file}","${summary.summary}","${summary.count}","${summary.firstOccurrence?.toISOString() || ''}","${summary.lastOccurrence?.toISOString() || ''}","${summary.level}"`
        )
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_summaries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="log-summary aws-modern">
      <div className="summary-header">
        <h2>Log Summary</h2>
        <div className="summary-controls">
          <select
            className="loglevel-filter"
            value={logLevelFilter}
            onChange={e => setLogLevelFilter(e.target.value)}
            style={{ marginRight: '1rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {LOG_LEVEL_FILTERS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="file-filter"
            value={fileFilter}
            onChange={e => setFileFilter(e.target.value)}
            style={{ marginRight: '1rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {allFiles.map(f => (
              <option key={f} value={f}>{f === 'all' ? 'All Files' : f}</option>
            ))}
          </select>
          <input
            className="search-bar"
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ marginRight: '1rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', minWidth: 180 }}
          />
          <button 
            className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            🔄 {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button className="export-btn" onClick={exportSummaries}>
            📥 Export Summary
          </button>
          <button className="clear-btn" onClick={clearAllLogs}>
            🗑️ Clear All
          </button>
        </div>
      </div>
      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading log summaries...</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={fetchLogs} className="retry-btn">Retry</button>
        </div>
      )}
      {!loading && filteredFileGroups.length === 0 && (
        <div className="no-summaries">
          <div className="no-summaries-icon">📊</div>
          <h3>No Log Summaries</h3>
          <p>No errors or issues have been detected in the system.</p>
        </div>
      )}
      {!loading && filteredFileGroups.length > 0 && (
        <div className="aws-cards-container">
          {filteredFileGroups.map(fileGroup => (
            <div key={fileGroup.file} className="aws-file-card">
              <div className="aws-file-header" onClick={() => setSelectedFile(selectedFile === fileGroup.file ? null : fileGroup.file)}>
                <span className="aws-file-icon">📄</span>
                <span className="aws-file-title">{fileGroup.file}</span>
                <span className="aws-file-meta">{fileGroup.summaries.length} types, {fileGroup.summaries.reduce((s, sm) => s + sm.count, 0)} logs</span>
                <span className="aws-file-expand">{selectedFile === fileGroup.file ? '▼' : '▶'}</span>
              </div>
              {selectedFile === fileGroup.file && (
                <div className="aws-summary-list">
                  {fileGroup.summaries.map(summary => (
                    <div key={summary.summary} className={`aws-summary-card`}>
                      <div className="aws-summary-header" onClick={() => setSelectedSummary(selectedSummary === summary.summary ? null : summary.summary)}>
                        <span className="aws-severity-pill" style={{ background: SEVERITY_COLORS[summary.level] || '#b4b7bd' }}>
                          {SEVERITY_ICONS[summary.level] || '📝'} {summary.level.toUpperCase()}
                        </span>
                        <span className="aws-summary-title">{summary.summary}</span>
                        <span className="aws-summary-meta">{summary.count} logs</span>
                        <span className="aws-summary-time">{formatTimeAgo(summary.lastOccurrence)} <span className="aws-summary-abs">({summary.lastOccurrence?.toLocaleString()})</span></span>
                        <span className="aws-summary-expand">{selectedSummary === summary.summary ? '▼' : '▶'}</span>
                      </div>
                      {selectedSummary === summary.summary && (
                        <div className="aws-summary-details">
                          <div className="aws-details-header">
                            <span>Technical Details ({summary.logs.length} logs)</span>
                            <span className="aws-copy-btn" onClick={() => copyToClipboard(summary.logs.join('\n'))}>📋 Copy All</span>
                          </div>
                          <div className="aws-logs-list">
                            {summary.logs.map((log, idx) => (
                              <div key={idx} className="aws-log-entry">
                                <span className="aws-log-timestamp">{(() => {
                                  const match = log.match(/\[(.*?)\]/);
                                  return match ? new Date(match[1]).toLocaleString() : 'Unknown time';
                                })()}</span>
                                <span className="aws-log-message">{log}</span>
                                <span className="aws-copy-btn" onClick={() => copyToClipboard(log)}>📋</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogSummary; 