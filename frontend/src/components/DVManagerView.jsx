import React, { useEffect, useState } from 'react';
import './DVManagerView.css';

const columns = [
  { key: 'req_total', label: 'Req_Total' },
  { key: 'req_covered', label: 'Req_Covered' },
  { key: 'req_uncovered', label: 'Req_Uncovered' },
  { key: 'code_coverage_percent', label: 'Code_Coverage (%)' },
  { key: 'functional_coverage_percent', label: 'Functional_Coverage (%)' },
];

function DVManagerView({ filters = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('');

  // Fetch data function (shows spinner)
  const fetchDVData = () => {
    const filterParams = Object.fromEntries(
      Object.entries({ ...filters, module: moduleFilter }).filter(([_, v]) => v)
    );
    const queryParams = new URLSearchParams(filterParams).toString();
    setLoading(true);
    setError(null);
    fetch(`/api/dv-data${queryParams ? `?${queryParams}` : ''}`)
      .then(res => res.json())
      .then(json => setData(Array.isArray(json) ? json : []))
      .catch(err => setError('Failed to fetch DV data'))
      .finally(() => setLoading(false));
  };

  // Silent background refresh (no spinner)
  const silentRefresh = () => {
    const filterParams = Object.fromEntries(
      Object.entries({ ...filters, module: moduleFilter }).filter(([_, v]) => v)
    );
    const queryParams = new URLSearchParams(filterParams).toString();
    fetch(`/api/dv-data${queryParams ? `?${queryParams}` : ''}`)
      .then(res => res.json())
      .then(json => {
        if (JSON.stringify(json) !== JSON.stringify(data)) {
          setData(Array.isArray(json) ? json : []);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDVData(); // initial load with spinner
    const interval = setInterval(silentRefresh, 10000); // silent background refresh
    return () => clearInterval(interval);
  }, [JSON.stringify(filters), moduleFilter]);

  // Module filter options
  const modules = Array.from(new Set(data.map(row => row.module).filter(Boolean)));
  const filteredData = moduleFilter ? data.filter(row => row.module === moduleFilter) : data;

  // Summary stats
  const total = filteredData.length;
  const pass = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'complete').length;
  const fail = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'fail').length;
  const partial = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'partial').length;

  // Stat cards for summary
  const statCards = [
    {
      label: 'Total',
      value: total,
      className: 'stat-card stat-card--primary',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/></svg>
      ),
    },
    {
      label: 'Complete',
      value: pass,
      className: 'stat-card stat-card--success',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>
      ),
    },
    {
      label: 'Partial',
      value: partial,
      className: 'stat-card stat-card--warning',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>
      ),
    },
    {
      label: 'Fail',
      value: fail,
      className: 'stat-card stat-card--danger',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="dv-manager-view">
        <div className="dv-loading-container">
          <div className="dv-loading-spinner"></div>
          <p>Loading DV manager data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dv-manager-view">
        <div className="dv-error-container">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchDVData} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dv-manager-view">
      {/* Header Section */}
      <div className="dv-view-header">
        <div className="header-content">
          <h2>DV Manager Dashboard</h2>
          <p>Comprehensive overview of all DV modules and their status</p>
        </div>
        <div className="header-actions">
          <button onClick={() => { setModuleFilter(''); fetchDVData(); }} className="btn btn-outline">Clear Filters</button>
          <button onClick={fetchDVData} className="btn btn-primary">Refresh</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-overview">
        {statCards.map(card => (
          <div className={card.className} key={card.label}>
            <div className="stat-card__icon">{card.icon}</div>
            <div className="stat-card__content">
              <h3>{card.label}</h3>
              <div className="stat-number">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {/* <div className="dv-summary-stats">
        <span>Total: <b>{total}</b></span>
        <span>Complete: <b>{pass}</b></span>
        <span>Partial: <b>{partial}</b></span>
        <span>Fail: <b>{fail}</b></span>
      </div> */}

      {/* Module Filter */}
      <div style={{ margin: '16px 0' }}>
        <label htmlFor="module-filter" style={{ fontWeight: 600 }}>Module:</label>
        <select
          id="module-filter"
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginLeft: 8 }}
        >
          <option value="">All</option>
          {modules.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Data Table */}
      <div className="dv-data-table-container">
        <div className="dv-table-header">
          <h3>Table: <span style={{ color: '#1e293b' }}>dv_data_raw</span></h3>
          <div className="dv-table-stats">
            <span>Showing {filteredData.length} of {data.length} records</span>
          </div>
        </div>
        <div className="dv-table-scroll">
          <table className="dv-manager-table" border={1} cellPadding={6} cellSpacing={0}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} title={col.label}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={columns.length}>No DV data found.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map(col => (
                      <td key={col.key}>{row[col.key] ?? 'N/A'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default DVManagerView; 