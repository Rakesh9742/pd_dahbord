import React, { useState, useEffect } from 'react';
import './ManagerView.css';

const ManagerView = ({ user, projectFilters = {} }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    block_name: '',
    rtl_tag: '',
    block_health_index: '',
    domain_id: '',
    project_id: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    limit: 20,
    total: 0
  });
  const [filterInputs, setFilterInputs] = useState(filters);
  const [blockNameOptions, setBlockNameOptions] = useState([]);
  const [rtlTagOptions, setRtlTagOptions] = useState([]);

  // Fetch dropdown options for block name and RTL tag
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
          // For RTL tags, fetch unique RTL_tag values from the data
          // We'll fetch all unique RTL_tag values from the backend
          const rtlRes = await fetch('http://localhost:5000/api/data/manager-data?limit=1000', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (rtlRes.ok) {
            const rtlData = await rtlRes.json();
            const uniqueRtlTags = Array.from(new Set((rtlData.data || []).map(row => row.RTL_tag).filter(Boolean)));
            setRtlTagOptions(uniqueRtlTags);
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

  const fetchManagerData = async () => {
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

      const response = await fetch(`http://localhost:5000/api/data/manager-data?${queryParams}`, {
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
    if (filters.domain_id || filters.project_id || filters.block_name || filters.rtl_tag || filters.block_health_index) {
      fetchManagerData();
    } else if (!loading && data.length === 0) {
      // Initial load - fetch all data
      fetchManagerData();
    }
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
      rtl_tag: '', // Clear RTL Tag filter
      block_health_index: '', // Clear Block Status filter
      domain_id: '',
      project_id: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'healthy';
      case 'Warning': return 'warning';
      case 'Critical': return 'critical';
      default: return 'unknown';
    }
  };

  const getTicketPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'high';
      case 'Medium': return 'medium';
      case 'Low': return 'low';
      default: return 'low';
    }
  };

  const getQMSStatusColor = (status) => {
    switch (status) {
      case 'Compliant': return 'compliant';
      case 'Non-Compliant': return 'non-compliant';
      case 'Under Review': return 'under-review';
      default: return 'pending';
    }
  };

  const getSummaryStats = () => {
    const total = pagination.total;
    const healthy = data.filter(row => row.block_health_index === 'Healthy').length;
    const critical = data.filter(row => row.block_health_index === 'Critical').length;
    const compliant = data.filter(row => row.qms_status === 'Compliant').length;
    const warning = data.filter(row => row.block_health_index === 'Warning').length;

    return { total, healthy, critical, compliant, warning };
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
          <p>Loading manager data...</p>
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
          <button onClick={fetchManagerData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = getSummaryStats();

  const requiredKeys = [
    'block_name', 'user_name', 'RTL_tag', 'current_stage', 'block_health_index', 'brief_summary',
    'open_tickets', 'milestone', 'qms_status', 'run_end_time'
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
          <h2>Manager Dashboard</h2>
          <p>Comprehensive overview of all blocks and their status</p>
        </div>
        <div className="header-actions">
          <button onClick={clearFilters} className="btn btn-outline">
            Clear Filters
          </button>
          <button onClick={fetchManagerData} className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Remove the filters section entirely */}

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-header">
          <h3>Block Status Overview</h3>
          <div className="table-stats">
            <span>Showing {data.length} of {pagination.total} records</span>
          </div>
        </div>
        {/* Block Status, RTL Tag, and Block Name Filters */}
        <div style={{ padding: '16px 32px 0 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label htmlFor="block-status-filter" style={{ fontWeight: 600 }}>Block Status:</label>
          <select
            id="block-status-filter"
            value={filterInputs.block_health_index}
            onChange={e => {
              handleInputChange('block_health_index', e.target.value);
              handleFilterChange('block_health_index', e.target.value);
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
          >
            <option value="">All</option>
            <option value="Healthy">Healthy</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
            <option value="Unknown">Unknown</option>
          </select>

          <label htmlFor="rtl-tag-filter" style={{ fontWeight: 600 }}>RTL Tag:</label>
          <select
            id="rtl-tag-filter"
            value={filterInputs.rtl_tag}
            onChange={e => {
              handleInputChange('rtl_tag', e.target.value);
              handleFilterChange('rtl_tag', e.target.value);
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
          >
            <option value="">All</option>
            {rtlTagOptions.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

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
        </div>
        
        <div className="table-wrapper overflow-x-auto">
          <table className="manager-table table-fixed w-full border-collapse">
            <thead>
              <tr>
                <th className="w-40">Block Name</th>
                <th className="w-40">User Name</th>
                <th className="w-32">RTL Tag</th>
                <th className="w-40">Current Stage</th>
                <th className="w-32">Health Status</th>
                <th className="w-64">Brief Summary</th>
                <th className="w-32">Open Tickets</th>
                <th className="w-32">Milestone</th>
                <th className="w-32">QMS Status</th>
                <th className="w-40">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {normalizedData.map((row, index) => (
                <tr key={index} className="h-[48px]">
                  <td><div className="truncate px-2">{sanitizeCell(row.block_name)}</div></td>
                  <td><div className="truncate px-2">{sanitizeCell(row.user_name)}</div></td>
                  <td><div className="truncate px-2">{sanitizeCell(row.RTL_tag)}</div></td>
                  <td><div className="truncate px-2">{sanitizeCell(row.current_stage)}</div></td>
                  <td>
                    <div className={`status-badge ${getHealthStatusColor(row.block_health_index)} truncate px-2`}>
                      {sanitizeCell(row.block_health_index)}
                    </div>
                  </td>
                  <td><div className="truncate px-2">{row.brief_summary !== 'N/A' ? (sanitizeCell(row.brief_summary).length > 60 ? `${sanitizeCell(row.brief_summary).substring(0, 60)}...` : sanitizeCell(row.brief_summary)) : 'No summary available'}</div></td>
                  <td>
                    <div className={`priority-badge ${getTicketPriorityColor(row.open_tickets)} truncate px-2`}>
                      {sanitizeCell(row.open_tickets)}
                    </div>
                  </td>
                  <td><div className="truncate px-2">{sanitizeCell(row.milestone)}</div></td>
                  <td>
                    <div className={`qms-badge ${getQMSStatusColor(row.qms_status)} truncate px-2`}>
                      {sanitizeCell(row.qms_status)}
                    </div>
                  </td>
                  <td><div className="truncate px-2">{row.run_end_time !== 'N/A' ? new Date(row.run_end_time).toLocaleDateString() : 'N/A'}</div></td>
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

export default ManagerView; 