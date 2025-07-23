import React, { useEffect, useState } from 'react';

const columns = [
  { key: 'project_id', label: 'Project ID' },
  { key: 'module', label: 'Module' },
  { key: 'tb_dev_total', label: 'TB Dev Total' },
  { key: 'tb_dev_coded', label: 'TB Dev Coded' },
  { key: 'test_total', label: 'Test Total' },
  { key: 'test_coded', label: 'Test Coded' },
  { key: 'test_pass', label: 'Test Pass' },
  { key: 'test_fail', label: 'Test Fail' },
  { key: 'assert_total', label: 'Assert Total' },
  { key: 'assert_coded', label: 'Assert Coded' },
  { key: 'assert_pass', label: 'Assert Pass' },
  { key: 'assert_fail', label: 'Assert Fail' },
  { key: 'code_coverage_percent', label: 'Code Coverage (%)' },
  { key: 'functional_coverage_percent', label: 'Functional Coverage (%)' },
  { key: 'req_total', label: 'Req Total' },
  { key: 'req_covered', label: 'Req Covered' },
  { key: 'req_uncovered', label: 'Req Uncovered' },
  { key: 'block_status', label: 'Block Status' },
];

function DVDataPage({ filters = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [modules, setModules] = useState([]);

  // Fetch data function (shows spinner)
  const fetchDVData = () => {
    const filterParams = Object.fromEntries(
      Object.entries({ ...filters, module: moduleFilter }).filter(([_, v]) => v)
    );
    const queryParams = new URLSearchParams(filterParams).toString();
    setLoading(true);
    fetch(`/api/dv-data${queryParams ? `?${queryParams}` : ''}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        // Extract unique modules for filter
        const uniqueModules = Array.from(new Set(json.map(row => row.module).filter(Boolean)));
        setModules(uniqueModules);
      })
      .catch(() => setLoading(false))
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
          setData(json);
          // Extract unique modules for filter
          const uniqueModules = Array.from(new Set(json.map(row => row.module).filter(Boolean)));
          setModules(uniqueModules);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDVData(); // initial load with spinner
    const interval = setInterval(silentRefresh, 10000); // silent background refresh
    return () => clearInterval(interval);
  }, [JSON.stringify(filters), moduleFilter]);

  const filteredData = moduleFilter
    ? data.filter(row => row.module === moduleFilter)
    : data;

  return (
    <div style={{ padding: 24, overflowX: 'auto' }}>
      <h2>Design Verification (DV) Data</h2>
      <div style={{ marginBottom: 16 }}>
        <label>Filter by Module: </label>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value=''>All</option>
          {modules.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <table border={1} cellPadding={6} cellSpacing={0} style={{ minWidth: 900 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center' }}>Loading...</td></tr>
          ) : filteredData.length === 0 ? (
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
  );
}

export default DVDataPage; 