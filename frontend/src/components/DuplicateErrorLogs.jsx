import React, { useEffect, useState } from 'react';
import './AdminPanel.css';

const DuplicateErrorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:5000/api/data/duplicate-errors', {
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

  return (
    <div className="duplicate-error-logs">
      <h3>Duplicate Entry Error Logs</h3>
      {loading && <div>Loading logs...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && logs.length === 0 && <div>No duplicate errors found.</div>}
      {!loading && logs.length > 0 && (
        <ul className="logs-list">
          {logs.map((log, idx) => (
            <li key={idx}>{log}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DuplicateErrorLogs;
