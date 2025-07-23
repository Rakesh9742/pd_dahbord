import React, { useState, useEffect } from 'react';
import './ManagerView.css'; // Reuse styles for consistency

const columns = [
  { key: 'block_name', label: 'Block Name' },
  { key: 'RTL_tag', label: 'RTL Tag' },
  { key: 'experiment', label: 'Experiment' },
  { key: 'run_directory', label: 'Run Dir' },
  { key: 'current_stage', label: 'Current Stage' },
  { key: 'interface_timing', label: 'Interface Timing' },
  { key: 'internal_timing', label: 'Internal Timing' },
  { key: 'max_tran_wns_nvp', label: 'Max tran (WNS/NVP)' },
  { key: 'max_cap_wns_nvp', label: 'Max cap (WNS/NVP)' },
  { key: 'noise', label: 'Noise' },
  { key: 'congestion_drc_metrics', label: 'Congestion/DRC metrics' },
  { key: 'area', label: 'Area' },
  { key: 'inst_count', label: 'Inst count' },
  { key: 'utilization', label: 'Utilization' },
  { key: 'logs_errors_warnings', label: 'Logs Errors & Warnings' },
  { key: 'run_status', label: 'Run Status' },
  { key: 'runtime_seconds', label: 'Runtime' },
  { key: 'ai_overall_summary', label: 'AI Summary & Suggestions' },
  { key: 'ir_static', label: 'IR (Static)' },
  { key: 'ir_dynamic', label: 'IR (Dynamic)' },
  { key: 'em_power_signal', label: 'EM (Power, Signal)' },
  { key: 'pv_drc', label: 'PV (DRC)' },
  { key: 'lvs', label: 'LVS' },
  { key: 'lec', label: 'LEC' },
  { key: 'open_closed_tickets', label: 'Open/Closed Tickets' },
  { key: 'tickets_priority', label: 'Tickets Priority' },
  { key: 'qms_status', label: 'QMS' }
];

const LeadView = ({ user, projectFilters = {} }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    block_name: '',
    stage: '',
    domain_id: '',
    project_id: ''
  });
  const [filterInputs, setFilterInputs] = useState(filters);
  const [pagination, setPagination] = useState({
    current: 1,
    limit: 20,
    total: 0
  });
  const [blockNameOptions, setBlockNameOptions] = useState([]);
  const [stageOptions, setStageOptions] = useState([]);

  // Fetch dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/data/filter-options', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const result = await response.json();
          setBlockNameOptions(result.blocks || []);
          
          // Fetch unique stages from lead data
          const leadRes = await fetch('http://localhost:5000/api/data/lead-data?limit=1000', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (leadRes.ok) {
            const leadData = await leadRes.json();
            const uniqueStages = Array.from(new Set((leadData.data || []).map(row => row.current_stage).filter(Boolean)));
            setStageOptions(uniqueStages);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchOptions();
  }, []);

  // Update filterInputs as user types
  const handleInputChange = (key, value) => {
    setFilterInputs(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters only on search
  const applyFilters = () => {
    setFilters(filterInputs);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Only include filters that have a value
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const queryParams = new URLSearchParams({
        ...filterParams,
        limit: pagination.limit,
        offset: (pagination.current - 1) * pagination.limit
      });
      const response = await fetch(`http://localhost:5000/api/data/lead-data?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if we have meaningful filters or if this is the initial load
    if (filters.domain_id || filters.project_id || filters.block_name || filters.stage) {
      fetchLeadData();
    } else if (!loading && data.length === 0) {
      // Initial load - fetch all data
      fetchLeadData();
    }
    // eslint-disable-next-line
  }, [filters, pagination.current]);

  // Update filters when projectFilters prop changes
  useEffect(() => {
    setFilters(prevFilters => {
      const newFilters = {
        ...prevFilters,
        domain_id: projectFilters?.domain_id || '',
        project_id: projectFilters?.project_id || ''
      };
      // Only update if the filters actually changed
      if (prevFilters.domain_id !== newFilters.domain_id || prevFilters.project_id !== newFilters.project_id) {
        setFilterInputs(newFilters);
        return newFilters;
      }
      return prevFilters;
    });
  }, [projectFilters]);

  // Debug: Log when component mounts
  useEffect(() => {
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const clearFilters = () => {
    setFilters({
      block_name: '',
      stage: '',
      domain_id: '',
      project_id: ''
    });
    setFilterInputs({
      block_name: '',
      stage: '',
      domain_id: '',
      project_id: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getRunStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'healthy';
      case 'running': return 'warning';
      case 'failed': return 'critical';
      case 'pending': return 'unknown';
      default: return 'unknown';
    }
  };

  const getTicketPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  };

  const getQMSStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant': return 'compliant';
      case 'non-compliant': return 'non-compliant';
      case 'under review': return 'under-review';
      default: return 'pending';
    }
  };

  // Utility function to sanitize cell values for display
  const sanitizeCell = (value) => {
    if (typeof value === 'string') {
      // Remove line breaks and trim whitespace
      return value.replace(/\s+/g, ' ').trim();
    }
    if (typeof value === 'object' && value !== null) {
      // If value is an object or array, return a summary or empty string
      return Array.isArray(value) ? value.join(', ') : '';
    }
    return value !== undefined && value !== null ? value : 'N/A';
  };

  if (loading) {
    return (
      <div className="manager-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading lead data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-view">
        <div className="error-container">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchLeadData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const requiredKeys = [
    'block_name', 'RTL_tag', 'current_stage', 'run_status', 'runtime_seconds',
    'interface_timing', 'internal_timing', 'max_tran_wns_nvp', 'max_cap_wns_nvp', 'area',
    'utilization', 'tickets_priority', 'qms_status', 'run_end_time'
  ];
  const normalizedData = data.map(row => {
    const normalizedRow = {};
    requiredKeys.forEach(key => {
      normalizedRow[key] = row[key] !== undefined && row[key] !== null ? row[key] : 'N/A';
    });
    return normalizedRow;
  });

  return (
    <div className={`manager-view ${(projectFilters.project_id || projectFilters.domain_id) ? 'filters-active' : ''}`}>
      {/* Header Section */}
      <div className="view-header">
        <div className="header-content">
          <h2>Lead Dashboard</h2>
          <p>Latest stage data for each block - showing most recent data per stage</p>
        </div>
        <div className="header-actions">
          <button onClick={clearFilters} className="btn btn-outline">
            Clear Filters
          </button>
          <button onClick={fetchLeadData} className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-header">
          <h3>Block Data Overview</h3>
          <div className="table-stats">
            <span>Showing {data.length} of {pagination.total} records</span>
          </div>
        </div>
        
        {/* Filters */}
        <div style={{ padding: '16px 32px 0 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label htmlFor="block-name-filter" style={{ fontWeight: 600 }}>Block Name:</label>
          <select
            id="block-name-filter"
            value={filterInputs.block_name}
            onChange={e => {
              handleInputChange('block_name', e.target.value);
              handleFilterChange('block_name', e.target.value);
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
          >
            <option value="">All</option>
            {blockNameOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label htmlFor="stage-filter" style={{ fontWeight: 600 }}>Stage:</label>
          <select
            id="stage-filter"
            value={filterInputs.stage}
            onChange={e => {
              handleInputChange('stage', e.target.value);
              handleFilterChange('stage', e.target.value);
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
          >
            <option value="">All</option>
            {stageOptions.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="data-table min-w-[1600px] w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Block Name</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>RTL Tag</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Current Stage</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Run Status</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Runtime</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Interface Timing</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Internal Timing</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Max tran (WNS/NVP)</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Max cap (WNS/NVP)</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Area</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Utilization</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Tickets Priority</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>QMS Status</th>
                <th className="px-4 py-3 text-left uppercase text-xs font-semibold sticky top-0 z-10" style={{color: '#222', fontWeight: 'bold'}}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {normalizedData.map((row, index) => (
                <tr key={index} className={`data-row ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}> 
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.block_name)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.RTL_tag)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.current_stage)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>
                    <span className={`status-badge ${getRunStatusColor(row.run_status)}`}>{sanitizeCell(row.run_status)}</span>
                  </td>
                  <td className="px-4 py-3" style={{color: '#222'}}>
                    {row.runtime_seconds !== 'N/A' ? `${sanitizeCell(row.runtime_seconds)}s` : 'N/A'}
                  </td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.interface_timing)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.internal_timing)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.max_tran_wns_nvp)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.max_cap_wns_nvp)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.area)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>{sanitizeCell(row.utilization)}</td>
                  <td className="px-4 py-3" style={{color: '#222'}}>
                    <span className={`priority-badge ${getTicketPriorityColor(row.tickets_priority)}`}>{sanitizeCell(row.tickets_priority)}</span>
                  </td>
                  <td className="px-4 py-3" style={{color: '#222'}}>
                    <span className={`qms-badge ${getQMSStatusColor(row.qms_status)}`}>{sanitizeCell(row.qms_status)}</span>
                  </td>
                  <td className="px-4 py-3" style={{color: '#222'}}>
                    {row.run_end_time && row.run_end_time !== 'N/A'
                      ? new Date(row.run_end_time).toLocaleDateString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="btn btn-outline"
            >
              ← Previous
            </button>
            <div className="page-info">
              <span>Page {pagination.current} of {Math.ceil(pagination.total / pagination.limit)}</span>
              <span className="page-details">({pagination.total} total records)</span>
            </div>
            <button
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.limit)}
              className="btn btn-outline"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadView; 