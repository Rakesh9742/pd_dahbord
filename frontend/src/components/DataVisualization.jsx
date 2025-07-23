import React, { useState, useEffect } from 'react';
import './DataVisualization.css';
import AnimatedNumber from './AnimatedNumber';
import ProgressBar from './ProgressBar';
// Removed EngineeringCharts import

const DataVisualization = ({ projectFilters = {} }) => {
  const [pdData, setPdData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    domain_id: '',
    project_id: '',
    block_name: '',
    experiment: ''
  });
  const [filterOptions, setFilterOptions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastCsvTimestamp, setLastCsvTimestamp] = useState(null);
  // Removed viewMode state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isStageStatsExpanded, setIsStageStatsExpanded] = useState(true); // New state for stage stats toggle
  const [showOnlySelectedRow, setShowOnlySelectedRow] = useState(false); // New state for single row view
  const [currentUser, setCurrentUser] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPDStats();
    fetchPDData();
    fetchCurrentUser();
  }, []);

  // Add logging for fetched data and filters
  useEffect(() => {
    console.log('[EngineerView] Filters from projectFilters:', projectFilters);
    console.log('[EngineerView] Local filters state:', filters);
    console.log('[EngineerView] Raw fetched pdData:', pdData);
  }, [pdData, filters, projectFilters]);

  // Update filters when projectFilters prop changes
  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      domain_id: projectFilters?.domain_id || '',
      project_id: projectFilters?.project_id || ''
    }));
  }, [projectFilters]);

  // Fetch filter options on mount and when domain changes
  useEffect(() => {
    fetchFilterOptions(filters.domain_id);
    // eslint-disable-next-line
  }, [filters.domain_id]);

  // Fetch filter options when project changes
  useEffect(() => {
    if (filters.domain_id) {
      fetchFilterOptions(filters.domain_id, filters.project_id);
    }
  }, [filters.project_id]);

  // Fetch filter options when block changes
  useEffect(() => {
    if (filters.domain_id) {
      fetchFilterOptions(filters.domain_id, filters.project_id, filters.block_name);
    }
  }, [filters.block_name]);

  // Fetch data when filters or page changes
  useEffect(() => {
    fetchPDData();
    fetchPDStats();
  }, [filters, currentPage]);

  // Handle full screen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    if (!isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  // Handle escape key for full screen
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullScreen]);

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    let dataToSort = pdData;
    
    // If in single row view, only show the selected row
    if (showOnlySelectedRow && selectedRow !== null) {
      dataToSort = [pdData[selectedRow]];
    }
    
    if (!sortConfig.key) return dataToSort;

    const sorted = [...dataToSort].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle numeric values
      if (sortConfig.key === 'area_um2' || sortConfig.key === 'inst_count' || sortConfig.key === 'utilization') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Handle date values
      if (sortConfig.key === 'run_end_time') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    console.log('[EngineerView] Data passed to table (after sorting/filtering):', sorted);
    return sorted;
  };

  const fetchFilterOptions = async (domainId = '', projectId = '', blockName = '') => {
    try {
      const queryParams = new URLSearchParams();
      if (domainId) queryParams.append('domain_id', domainId);
      if (projectId) queryParams.append('project_id', projectId);
      if (blockName) queryParams.append('block_name', blockName);

      const response = await fetch(`http://localhost:5000/api/data/filter-options?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Poll for new CSV file every 10 seconds, only refresh data if timestamp changes
  useEffect(() => {
    const checkForNewCsv = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/data/last-csv-timestamp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.timestamp && data.timestamp !== lastCsvTimestamp) {
            setLastCsvTimestamp(data.timestamp);
            fetchPDData(true); // silent refresh
            fetchPDStats();
          }
        }
      } catch (error) {
        console.error('Error checking for new CSV:', error);
      }
    };
    checkForNewCsv(); // check immediately
    const interval = setInterval(checkForNewCsv, 10000); // 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [lastCsvTimestamp]);

  // Poll for run data every 10 seconds (silent refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPDData(true); // silent refresh
      fetchPDStats();    // refresh stats too
    }, 10);
    return () => clearInterval(interval);
  }, [filters, currentPage]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPDStats = async () => {
    try {
      // Only include filters that have a value
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const queryParams = new URLSearchParams(filterParams);
      const url = queryParams.toString() 
        ? `http://localhost:5000/api/data/pd-stats?${queryParams}`
        : 'http://localhost:5000/api/data/pd-stats';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching PD stats:', error);
    }
  };

  // fetchPDData: with optional silent param to avoid spinner for background refresh
  const fetchPDData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Only include filters that have a value
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const queryParams = new URLSearchParams({
        ...filterParams,
        limit: 10,
        offset: (currentPage - 1) * 10
      });
      const response = await fetch(`http://localhost:5000/api/data/pd-data?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPdData(data.data);
        setTotalPages(Math.ceil(data.pagination.total / 10));
      }
    } catch (error) {
      console.error('Error fetching PD data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Reset dependent filters when parent filter changes
      if (key === 'domain_id') {
        // Reset project, block, and experiment when domain changes
        newFilters.project_id = '';
        newFilters.block_name = '';
        newFilters.experiment = '';
      } else if (key === 'project_id') {
        // Reset block and experiment when project changes
        newFilters.block_name = '';
        newFilters.experiment = '';
      } else if (key === 'block_name') {
        // Reset experiment when block changes
        newFilters.experiment = '';
      }
      
      return newFilters;
    });
  };

  const handleFilterSubmit = () => {
    // This is now handled by the useEffect that watches filters
    // But we can keep this for explicit user action
    fetchPDData();
    fetchPDStats();
  };

  const formatRuntime = (seconds) => {
    if (!seconds || isNaN(parseFloat(seconds))) return 'N/A';
    const numSeconds = parseFloat(seconds);
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'danger';
      case 'continue_with_error': return 'warning';
      default: return 'info';
    }
  };

  const handleRowClick = (row, index) => {
    if (showOnlySelectedRow) {
      // If already in single row view, toggle back to full view
      setShowOnlySelectedRow(false);
      setSelectedRow(null);
    } else {
      // Enter single row view with selected row
      setShowOnlySelectedRow(true);
      setSelectedRow(index);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDeleteRecord = async (recordId, event) => {
    event.stopPropagation(); // Prevent row selection when clicking delete
    
    // Store the record ID and show confirmation dialog
    setDeleteRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/data/pd-data/${deleteRecordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete record');
      }

      // Remove the deleted record from the data
      setPdData(prevData => prevData.filter(item => item.id !== deleteRecordId));
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage(error.message);
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000); // Hide after 5 seconds
    } finally {
      setShowDeleteConfirm(false);
      setDeleteRecordId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteRecordId(null);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const renderSortableHeader = (key, label) => (
    <th 
      className="sortable-header"
      onClick={() => handleSort(key)}
    >
      {label} {getSortIcon(key)}
    </th>
  );

  const toggleStageStats = () => {
    setIsStageStatsExpanded(!isStageStatsExpanded);
  };

  // Remove viewMode toggle buttons and EngineeringCharts rendering
  return (
    <div className="data-visualization">
      <div className="viz-header">
        {/* Removed view-toggle-buttons for charts/detailed */}
      </div>
      {/* Remove conditional rendering for charts view, always render detailed view */}
      {/* Enhanced Statistics Cards */}
      <div className="stats-overview fade-in">
        <div className="stat-card stat-card--primary animated stagger-1">
          <div className="stat-card__icon bounce-in">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-card__content">
            <h3>Total Runs</h3>
            <div className="stat-number">
              <AnimatedNumber value={stats?.overall_stats?.total_runs || 0} />
            </div>
            <div className="stat-trend">
              <span className="trend-indicator positive">↗</span>
              <span>Active monitoring</span>
            </div>
          </div>
        </div>
        
        <div className="stat-card stat-card--success animated stagger-2">
          <div className="stat-card__icon bounce-in">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-card__content">
            <h3>Passed Runs</h3>
            <div className="stat-number">
              <AnimatedNumber value={stats?.overall_stats?.passed_runs || 0} />
            </div>
            <div className="stat-progress">
              <ProgressBar percent={stats?.overall_stats?.total_runs ? Math.round((stats.overall_stats.passed_runs / stats.overall_stats.total_runs) * 100) : 0} color="#16a34a" />
              <span className="progress-label">
                {stats?.overall_stats?.total_runs ? Math.round((stats.overall_stats.passed_runs / stats.overall_stats.total_runs) * 100) : 0}% Success Rate
              </span>
            </div>
          </div>
        </div>
        
        <div className="stat-card stat-card--danger animated stagger-3">
          <div className="stat-card__icon bounce-in">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-card__content">
            <h3>Failed Runs</h3>
            <div className="stat-number">
              <AnimatedNumber value={stats?.overall_stats?.failed_runs || 0} />
            </div>
            <div className="stat-progress">
              <ProgressBar percent={stats?.overall_stats?.total_runs ? Math.round((stats.overall_stats.failed_runs / stats.overall_stats.total_runs) * 100) : 0} color="#dc2626" />
              <span className="progress-label">
                {stats?.overall_stats?.total_runs ? Math.round((stats.overall_stats.failed_runs / stats.overall_stats.total_runs) * 100) : 0}% Failure Rate
              </span>
            </div>
          </div>
        </div>
        
        <div className="stat-card stat-card--info animated stagger-4">
          <div className="stat-card__icon bounce-in">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
              <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-card__content">
            <h3>Avg Runtime</h3>
            <div className="stat-number">
              <AnimatedNumber value={stats?.overall_stats?.avg_runtime ? parseFloat(stats.overall_stats.avg_runtime).toFixed(2) : 0} />
            </div>
            <div className="stat-unit">hours</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--warning animated stagger-5">
          <div className="stat-card__icon bounce-in">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-card__content">
            <h3>Success Rate</h3>
            <div className="stat-number">
              <AnimatedNumber value={stats?.overall_stats?.total_runs ? Math.round((stats.overall_stats.passed_runs / stats.overall_stats.total_runs) * 100) : 0} />
            </div>
            <div className="stat-unit">%</div>
          </div>
        </div>
        
        {/* Remove the Active Projects card */}
      </div>

      {/* Data Table Section with Secondary Filters */}
      <div className={`data-table-section ${isFullScreen ? 'fullscreen-table' : ''}`}>
        <div className="table-header">
          <div className="table-header-content">
            <h3>
              {(() => {
                let title = '';
                if (filters.domain_id) {
                  const selectedDomain = filterOptions.domains?.find(d => d.id === filters.domain_id);
                  if (selectedDomain) {
                    if (selectedDomain.full_name.toLowerCase().includes('physical design')) {
                      title = 'PD Run Data';
                    } else {
                      title = `${selectedDomain.full_name} Run Data`;
                    }
                  }
                } else {
                  title = 'Run Data';
                }
                
                // Add indicator for single row view
                if (showOnlySelectedRow) {
                  title += ' - Single Row View';
                }
                
                return title;
              })()}
            </h3>
            
            <div className="table-actions">
              {showOnlySelectedRow && (
                <button 
                  className="back-to-all-btn"
                  onClick={() => {
                    setShowOnlySelectedRow(false);
                    setSelectedRow(null);
                  }}
                  title="Back to All Rows"
                >
                  ← Back to All
                </button>
              )}
              <button 
                className="fullscreen-btn"
                onClick={toggleFullScreen}
                title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              >
                {isFullScreen ? '✕' : '⛶'}
              </button>
            </div>
          </div>
          
          {/* Single Line Filters */}
          <div className="inline-filters">
            <div className="filter-row">
              {/* Removed Project filter dropdown */}
              <div className="filter-item">
                <label>Block Name</label>
                <select
                  value={filters.block_name}
                  onChange={(e) => handleFilterChange('block_name', e.target.value)}
                >
                  <option value="">All Blocks</option>
                  {filterOptions.blocks?.map(block => (
                    <option key={block} value={block}>{block}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>Experiment</label>
                <select
                  value={filters.experiment}
                  onChange={(e) => handleFilterChange('experiment', e.target.value)}
                >
                  <option value="">All Experiments</option>
                  {filterOptions.experiments?.map(exp => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>
              <div className="filter-actions">
                <button className="clear-filter-btn" onClick={() => {
                  setFilters({
                    domain_id: filters.domain_id, // Keep domain filter
                    project_id: filters.project_id, // Keep project filter
                    block_name: '',
                    experiment: ''
                  });
                  setCurrentPage(1);
                }}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          pdData.length > 0 ? (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {renderSortableHeader('project_name', 'Project')}
                      {renderSortableHeader('block_name', 'Block Name')}
                      {renderSortableHeader('experiment', 'Experiment')}
                      {renderSortableHeader('RTL_tag', 'RTL Tag')}
                      {renderSortableHeader('user_name', 'User Name')}
                      <th>Run Directory</th>
                      {renderSortableHeader('run_end_time', 'Run End Time')}
                      {renderSortableHeader('stage', 'Stage')}
                      <th>Internal Timing</th>
                      <th>Interface Timing</th>
                      <th>Max Tran (WNS/NVP)</th>
                      <th>Max Cap (WNS/NVP)</th>
                      <th>Noise</th>
                      <th>MPW/Min Period/Double Switching</th>
                      <th>Congestion/DRC Metrics</th>
                      {renderSortableHeader('area_um2', 'Area (um²)')}
                      {renderSortableHeader('inst_count', 'Inst Count')}
                      {renderSortableHeader('utilization', 'Utilization')}
                      <th>Logs Errors & Warnings</th>
                      {renderSortableHeader('run_status', 'Run Status')}
                      {renderSortableHeader('runtime_seconds', 'Runtime')}
                      <th>AI Summary</th>
                      <th>IR (Static)</th>
                      <th>EM (Power, Signal)</th>
                      <th>PV (DRC)</th>
                      <th>LVS</th>
                      <th>LEC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData().map((row, index) => (
                      <React.Fragment key={index}>
                        <tr 
                          className={`data-row ${selectedRow === index ? 'selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                          onClick={() => handleRowClick(row, index)}
                        >
                          <td className="project-cell">
                            <div 
                              className="cell-content project-clickable"
                              // Removed onClick handler for project cell
                            >
                              <span className="cell-text">{row.project_name || 'N/A'}</span>
                              <div className="project-indicator">
                                {/* Removed project indicator */}
                              </div>
                              {selectedRow === index && (
                                <div className="row-indicator">▶</div>
                              )}
                            </div>
                          </td>
                          <td>{row.block_name || 'N/A'}</td>
                          <td>{row.experiment || 'N/A'}</td>
                          <td>{row.RTL_tag || 'N/A'}</td>
                          <td>{row.user_name || 'N/A'}</td>
                          <td className="directory-cell">
                            <div className="truncated-text" title={row.run_directory || 'N/A'}>
                              {row.run_directory || 'N/A'}
                            </div>
                          </td>
                          <td className="date-cell">
                            {row.run_end_time ? new Date(row.run_end_time).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="stage-cell">
                            <span className="stage-badge">{row.stage || 'N/A'}</span>
                          </td>
                          <td className="timing-cell">
                            <div className="timing-value" title={row.internal_timing || 'N/A'}>
                              {row.internal_timing || 'N/A'}
                            </div>
                          </td>
                          <td className="timing-cell">
                            <div className="timing-value" title={row.interface_timing || 'N/A'}>
                              {row.interface_timing || 'N/A'}
                            </div>
                          </td>
                          <td className="metric-cell">{row.max_tran_wns_nvp || 'N/A'}</td>
                          <td className="metric-cell">{row.max_cap_wns_nvp || 'N/A'}</td>
                          <td className="metric-cell">{row.noise || 'N/A'}</td>
                          <td className="metric-cell">{row.mpw_min_period_double_switching || 'N/A'}</td>
                          <td className="metric-cell">{row.congestion_drc_metrics || 'N/A'}</td>
                          <td className="area-cell">
                            {row.area_um2 && !isNaN(parseFloat(row.area_um2)) ? (
                              <span className="numeric-value">
                                {parseFloat(row.area_um2).toFixed(2)}
                              </span>
                            ) : 'N/A'}
                          </td>
                          <td className="count-cell">
                            {row.inst_count ? (
                              <span className="numeric-value">{row.inst_count}</span>
                            ) : 'N/A'}
                          </td>
                          <td className="utilization-cell">
                            {row.utilization && !isNaN(parseFloat(row.utilization)) ? (
                              <div className="utilization-display">
                                <span className="utilization-value">{parseFloat(row.utilization).toFixed(1)}%</span>
                                <div className="utilization-bar">
                                  <div 
                                    className="utilization-fill"
                                    style={{ width: `${Math.min(parseFloat(row.utilization), 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td className="logs-cell">
                            <div className="logs-content" title={row.logs_errors_warnings || 'N/A'}>
                              {row.logs_errors_warnings || 'N/A'}
                            </div>
                          </td>
                          <td className="status-cell">
                            <span className={`status-badge ${getStatusColor(row.run_status)}`}>
                              {row.run_status || 'N/A'}
                            </span>
                          </td>
                          <td className="runtime-cell">
                            <span className="runtime-display">
                              {formatRuntime(row.runtime_seconds)}
                            </span>
                          </td>
                          <td className="summary-cell">
                            <div className="summary-content" title={row.ai_summary || 'N/A'}>
                              {row.ai_summary || 'N/A'}
                            </div>
                          </td>
                          <td className="metric-cell">{row.ir_static || 'N/A'}</td>
                          <td className="metric-cell">{row.em_power_signal || 'N/A'}</td>
                          <td className="drc-cell">
                            <div className="drc-content" title={row.pv_drc || 'N/A'}>
                              {row.pv_drc || 'N/A'}
                            </div>
                          </td>
                          <td className="metric-cell">{row.lvs || 'N/A'}</td>
                          <td className="metric-cell">{row.lec || 'N/A'}</td>
                          <td className="actions-cell">
                            {currentUser && (
                              (currentUser.role_name === 'Admin') || 
                              (currentUser.name === row.user_name)
                            ) ? (
                              <button
                                className="delete-btn"
                                onClick={(e) => handleDeleteRecord(row.id, e)}
                                title="Delete this record"
                              >
                                🗑️
                              </button>
                            ) : (
                              <span className="no-delete-access" title="You can only delete your own records">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expanded Row Details */}
                        {(selectedRow === index || (showOnlySelectedRow && index === 0)) && (
                          <tr className="expanded-row">
                            <td colSpan="26">
                              <div className="row-details">
                                <div className="details-grid">
                                  <div className="detail-section">
                                    <h4>Run Information</h4>
                                    <div className="detail-content">
                                      <div className="detail-item">
                                        <span className="detail-label">Project:</span>
                                        <span className="detail-value">{row.project_name || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Block:</span>
                                        <span className="detail-value">{row.block_name || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Experiment:</span>
                                        <span className="detail-value">{row.experiment || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">RTL Tag:</span>
                                        <span className="detail-value">{row.RTL_tag || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">User:</span>
                                        <span className="detail-value">{row.user_name || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Run Directory:</span>
                                        <span className="detail-value">{row.run_directory || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="detail-section">
                                    <h4>Timing Analysis</h4>
                                    <div className="detail-content">
                                      <div className="detail-item">
                                        <span className="detail-label">Internal Timing:</span>
                                        <span className="detail-value">{row.internal_timing || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Interface Timing:</span>
                                        <span className="detail-value">{row.interface_timing || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Max Tran (WNS/NVP):</span>
                                        <span className="detail-value">{row.max_tran_wns_nvp || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Max Cap (WNS/NVP):</span>
                                        <span className="detail-value">{row.max_cap_wns_nvp || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="detail-section">
                                    <h4>Physical Design</h4>
                                    <div className="detail-content">
                                      <div className="detail-item">
                                        <span className="detail-label">Area:</span>
                                        <span className="detail-value">
                                          {row.area_um2 && !isNaN(parseFloat(row.area_um2)) 
                                            ? `${parseFloat(row.area_um2).toFixed(2)} um²` 
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Instance Count:</span>
                                        <span className="detail-value">{row.inst_count || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Utilization:</span>
                                        <span className="detail-value">
                                          {row.utilization && !isNaN(parseFloat(row.utilization)) 
                                            ? `${parseFloat(row.utilization).toFixed(1)}%` 
                                            : 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="detail-section">
                                    <h4>AI Summary</h4>
                                    <div className="detail-content">
                                      <div className="ai-summary-text">
                                        {row.ai_summary || 'No AI summary available for this run.'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button 
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button 
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="no-data-message">
              No data found for the selected filters.
            </div>
          )
        )}
      </div>

      {/* Stage Statistics */}
      {stats.stage_stats && (
        <div className="stage-stats-section">
          <div 
            className="stage-stats-header accordion-header"
            onClick={toggleStageStats}
          >
            <h3>Stage-wise Statistics</h3>
            <span className="accordion-icon">
              {isStageStatsExpanded ? '▼' : '▶'}
            </span>
          </div>
          {isStageStatsExpanded && (
            <div className="stage-stats-content accordion-content">
              <div className="stage-stats-grid">
                {stats.stage_stats.map((stage, index) => (
                  <div key={index} className="stage-stat-card">
                    <h4>{stage.stage}</h4>
                    <div className="stage-metrics">
                      <div className="metric">
                        <span className="metric-label">Total Runs:</span>
                        <span className="metric-value">{stage.count}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Passed:</span>
                        <span className="metric-value success">{stage.passed}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Failed:</span>
                        <span className="metric-value danger">{stage.failed}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Success Rate:</span>
                        <span className="metric-value">
                          {stage.count ? Math.round((stage.passed / stage.count) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this record?</p>
              <p className="warning-text">This action cannot be undone and will remove the record from all views.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="message-overlay">
          <div className="message-content success-message">
            <div className="message-icon">✅</div>
            <div className="message-text">Record deleted successfully!</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className="message-overlay">
          <div className="message-content error-message">
            <div className="message-icon">❌</div>
            <div className="message-text">Error: {errorMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization; 