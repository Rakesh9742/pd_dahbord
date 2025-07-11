import React, { useEffect, useState } from 'react';
import './DuplicateErrorLogsMenu.css';

const LogsMenu = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLogs = async () => {
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
        setLogs(data.errors);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  // Extract file names from logs
  const files = Array.from(new Set(logs.map(log => {
    const match = log.match(/\[(.*?)\] \[(.*?)\]/);
    return match ? match[2] : null;
  }).filter(Boolean)));

  const filteredLogs = selectedFile
    ? logs.filter(log => log.includes(`[${selectedFile}]`))
    : [];

  return (
    <div className="duplicate-error-logs-menu">
      <h2>Logs</h2>
      {loading && <div>Loading logs...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && files.length === 0 && <div>No logs found.</div>}
      {!loading && files.length > 0 && (
        <div className="logs-files-list">
          <h3>Select a file to view errors:</h3>
          <ul className="files-list">
            {files.map((file, idx) => (
              <li
                key={idx}
                className={selectedFile === file ? 'selected' : ''}
                style={{ color: 'red', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setSelectedFile(file)}
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
      {selectedFile && (
        <div className="logs-list-container">
          <h4>Logs for <span style={{ color: 'red' }}>{selectedFile}</span>:</h4>
          <ul className="logs-list">
            {filteredLogs.map((log, idx) => (
              <li key={idx} style={{ color: 'red' }}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LogsMenu;
