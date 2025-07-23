import React, { useEffect, useState } from 'react';
import './DVLeadView.css';

const columns = [
  { key: 'module', label: 'Module' },
  { key: 'tb_dev_total', label: 'TB_Dev_Total' },
  { key: 'tb_dev_coded', label: 'TB_Dev_Coded' },
  { key: 'test_total', label: 'Test_Total' },
  { key: 'test_coded', label: 'Test_Coded' },
  { key: 'test_pass', label: 'Test_Pass' },
  { key: 'test_fail', label: 'Test_Fail' },
  { key: 'assert_total', label: 'Assert_Total' },
  { key: 'assert_coded', label: 'Assert_Coded' },
  { key: 'assert_pass', label: 'Assert_Pass' },
  { key: 'assert_fail', label: 'Assert_Fail' },
  { key: 'code_coverage_percent', label: 'Code_Coverage (%)' },
  { key: 'functional_coverage_percent', label: 'Functional_Coverage (%)' },
  { key: 'req_total', label: 'Req_Total' },
  { key: 'req_covered', label: 'Req_Covered' },
  { key: 'req_uncovered', label: 'Req_Uncovered' },
  { key: 'block_status', label: 'Block_Status' },
];

function DVLeadView({ filters = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [expandedRowIdx, setExpandedRowIdx] = useState(null);
  const [singleRowView, setSingleRowView] = useState(false);

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

  const handleRowClick = (idx) => {
    if (singleRowView && expandedRowIdx === idx) {
      setSingleRowView(false);
      setExpandedRowIdx(null);
    } else {
      setSingleRowView(true);
      setExpandedRowIdx(idx);
    }
  };

  // Module filter options
  const modules = Array.from(new Set(data.map(row => row.module).filter(Boolean)));
  const filteredData = moduleFilter ? data.filter(row => row.module === moduleFilter) : data;

  // Summary stats
  const total = filteredData.length;
  const pass = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'complete').length;
  const fail = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'fail').length;
  const partial = filteredData.filter(row => (row.block_status || '').toLowerCase() === 'partial').length;

  if (loading) {
    return (
      <div className="dv-lead-view">
        <div className="dv-loading-container">
          <div className="dv-loading-spinner"></div>
          <p>Loading DV lead data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dv-lead-view">
        <div className="dv-error-container">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchDVData} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

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

  // Full screen overlay for table
  const TableSection = (
    <div className="dv-data-table-container" style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fff', zIndex: 1000, overflow: 'auto', padding: 32 } : {}}>
      <div className="dv-table-header">
        {/* <h3>Table: <span style={{ color: '#1e293b' }}>dv_data_raw</span></h3> */}
        <div className="dv-table-stats">
          <span>Showing {filteredData.length} of {data.length} records</span>
          <button className="btn btn-outline" onClick={() => setIsFullScreen(f => !f)} style={{ marginLeft: 16 }}>
            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </div>
      </div>
      <div className="dv-table-scroll">
        <table className="dv-lead-table" border={1} cellPadding={6} cellSpacing={0}>
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
              singleRowView && expandedRowIdx !== null ? (
                <React.Fragment>
                  <tr
                    onClick={() => handleRowClick(expandedRowIdx)}
                    style={{ background: '#f1f5f9', cursor: 'pointer' }}
                  >
                    {columns.map(col => (
                      <td key={col.key}>{filteredData[expandedRowIdx][col.key] ?? 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="dv-expanded-row">
                    <td colSpan={columns.length}>
                      <div className="dv-row-details">
                        <div className="dv-details-grid">
                          {/* Card 1: General Info
                          <div className="dv-detail-section card-blue">
                            <h4>General Info</h4>
                            <div><b>Module:</b> {filteredData[expandedRowIdx].module ?? 'N/A'}</div>
                            <div><b>Block Status:</b> {filteredData[expandedRowIdx].block_status ?? 'N/A'}</div>
                          </div> */}
                          {/* Card 2: Testbench */}
                          <div className="dv-detail-section card-green">
                            <h4>Testbench</h4>
                            <div><b>TB Dev Total:</b> {filteredData[expandedRowIdx].tb_dev_total ?? 'N/A'}</div>
                            <div><b>TB Dev Coded:</b> {filteredData[expandedRowIdx].tb_dev_coded ?? 'N/A'}</div>
                          </div>
                          {/* Card 3: Test & Assert */}
                          <div className="dv-detail-section card-yellow">
                            <h4>Test & Assert</h4>
                            <div><b>Test Total:</b> {filteredData[expandedRowIdx].test_total ?? 'N/A'}</div>
                            <div><b>Test Coded:</b> {filteredData[expandedRowIdx].test_coded ?? 'N/A'}</div>
                            <div><b>Test Pass:</b> {filteredData[expandedRowIdx].test_pass ?? 'N/A'}</div>
                            <div><b>Test Fail:</b> {filteredData[expandedRowIdx].test_fail ?? 'N/A'}</div>
                            <div><b>Assert Total:</b> {filteredData[expandedRowIdx].assert_total ?? 'N/A'}</div>
                            <div><b>Assert Coded:</b> {filteredData[expandedRowIdx].assert_coded ?? 'N/A'}</div>
                            <div><b>Assert Pass:</b> {filteredData[expandedRowIdx].assert_pass ?? 'N/A'}</div>
                            <div><b>Assert Fail:</b> {filteredData[expandedRowIdx].assert_fail ?? 'N/A'}</div>
                          </div>
                          {/* Card 4: Coverage & Requirements */}
                          <div className="dv-detail-section card-purple">
                            <h4>Coverage & Requirements</h4>
                            <div><b>Code Coverage (%):</b> {filteredData[expandedRowIdx].code_coverage_percent ?? 'N/A'}</div>
                            <div><b>Functional Coverage (%):</b> {filteredData[expandedRowIdx].functional_coverage_percent ?? 'N/A'}</div>
                            <div><b>Req Total:</b> {filteredData[expandedRowIdx].req_total ?? 'N/A'}</div>
                            <div><b>Req Covered:</b> {filteredData[expandedRowIdx].req_covered ?? 'N/A'}</div>
                            <div><b>Req Uncovered:</b> {filteredData[expandedRowIdx].req_uncovered ?? 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ) : (
                filteredData.map((row, idx) => (
                  <React.Fragment key={row.id || idx}>
                    <tr
                      onClick={() => handleRowClick(idx)}
                      style={{ cursor: 'pointer', background: expandedRowIdx === idx ? '#f1f5f9' : undefined }}
                    >
                      {columns.map(col => (
                        <td key={col.key}>{row[col.key] ?? 'N/A'}</td>
                      ))}
                    </tr>
                    {expandedRowIdx === idx && !singleRowView && (
                      <tr className="dv-expanded-row">
                        <td colSpan={columns.length}>
                          <div className="dv-row-details">
                            <div className="dv-details-grid">
                              {/* Card 1: General Info */}
                              <div className="dv-detail-section card-blue">
                                <h4>General Info</h4>
                                <div><b>Module:</b> {row.module ?? 'N/A'}</div>
                                <div><b>Block Status:</b> {row.block_status ?? 'N/A'}</div>
                              </div>
                              {/* Card 2: Testbench */}
                              <div className="dv-detail-section card-green">
                                <h4>Testbench</h4>
                                <div><b>TB Dev Total:</b> {row.tb_dev_total ?? 'N/A'}</div>
                                <div><b>TB Dev Coded:</b> {row.tb_dev_coded ?? 'N/A'}</div>
                              </div>
                              {/* Card 3: Test & Assert */}
                              <div className="dv-detail-section card-yellow">
                                <h4>Test & Assert</h4>
                                <div><b>Test Total:</b> {row.test_total ?? 'N/A'}</div>
                                <div><b>Test Coded:</b> {row.test_coded ?? 'N/A'}</div>
                                <div><b>Test Pass:</b> {row.test_pass ?? 'N/A'}</div>
                                <div><b>Test Fail:</b> {row.test_fail ?? 'N/A'}</div>
                                <div><b>Assert Total:</b> {row.assert_total ?? 'N/A'}</div>
                                <div><b>Assert Coded:</b> {row.assert_coded ?? 'N/A'}</div>
                                <div><b>Assert Pass:</b> {row.assert_pass ?? 'N/A'}</div>
                                <div><b>Assert Fail:</b> {row.assert_fail ?? 'N/A'}</div>
                              </div>
                              {/* Card 4: Coverage & Requirements */}
                              <div className="dv-detail-section card-purple">
                                <h4>Coverage & Requirements</h4>
                                <div><b>Code Coverage (%):</b> {row.code_coverage_percent ?? 'N/A'}</div>
                                <div><b>Functional Coverage (%):</b> {row.functional_coverage_percent ?? 'N/A'}</div>
                                <div><b>Req Total:</b> {row.req_total ?? 'N/A'}</div>
                                <div><b>Req Covered:</b> {row.req_covered ?? 'N/A'}</div>
                                <div><b>Req Uncovered:</b> {row.req_uncovered ?? 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dv-lead-view">
      {/* Header Section */}
      <div className="dv-view-header">
        <div className="header-content">
          <h2>DV Lead Dashboard</h2>
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

      {/* Data Table (with full screen support) */}
      {isFullScreen ? (
        <div className="dv-fullscreen-overlay">{TableSection}</div>
      ) : (
        TableSection
      )}

      {/* Module Classifier Modal */}
      {selectedModule && (
        <div className="dv-modal-overlay" onClick={() => setSelectedModule(null)}>
          <div className="dv-modal" onClick={e => e.stopPropagation()}>
            <button className="dv-modal-close" onClick={() => setSelectedModule(null)}>&times;</button>
            <h2>Module Details: {selectedModule.module}</h2>
            <div className="dv-modal-content">
              {/* General Info */}
              <h4>General Info</h4>
              <div><b>Module:</b> {selectedModule.module ?? 'N/A'}</div>
              <div><b>Block Status:</b> {selectedModule.block_status ?? 'N/A'}</div>
              <hr/>
              {/* Testbench */}
              <h4>Testbench</h4>
              <div><b>TB Dev Total:</b> {selectedModule.tb_dev_total ?? 'N/A'}</div>
              <div><b>TB Dev Coded:</b> {selectedModule.tb_dev_coded ?? 'N/A'}</div>
              <hr/>
              {/* Test */}
              <h4>Test</h4>
              <div><b>Test Total:</b> {selectedModule.test_total ?? 'N/A'}</div>
              <div><b>Test Coded:</b> {selectedModule.test_coded ?? 'N/A'}</div>
              <div><b>Test Pass:</b> {selectedModule.test_pass ?? 'N/A'}</div>
              <div><b>Test Fail:</b> {selectedModule.test_fail ?? 'N/A'}</div>
              <hr/>
              {/* Assert */}
              <h4>Assert</h4>
              <div><b>Assert Total:</b> {selectedModule.assert_total ?? 'N/A'}</div>
              <div><b>Assert Coded:</b> {selectedModule.assert_coded ?? 'N/A'}</div>
              <div><b>Assert Pass:</b> {selectedModule.assert_pass ?? 'N/A'}</div>
              <div><b>Assert Fail:</b> {selectedModule.assert_fail ?? 'N/A'}</div>
              <hr/>
              {/* Coverage */}
              <h4>Coverage</h4>
              <div><b>Code Coverage (%):</b> {selectedModule.code_coverage_percent ?? 'N/A'}</div>
              <div><b>Functional Coverage (%):</b> {selectedModule.functional_coverage_percent ?? 'N/A'}</div>
              <hr/>
              {/* Requirements */}
              <h4>Requirements</h4>
              <div><b>Req Total:</b> {selectedModule.req_total ?? 'N/A'}</div>
              <div><b>Req Covered:</b> {selectedModule.req_covered ?? 'N/A'}</div>
              <div><b>Req Uncovered:</b> {selectedModule.req_uncovered ?? 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DVLeadView; 