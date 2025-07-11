import React, { useState, useEffect } from 'react';
import './DataVisualization.css';
import AnimatedNumber from './AnimatedNumber';
import ProgressBar from './ProgressBar';
import ChatView from './ChatView';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DataVisualization = () => {
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
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed', 'charts', or 'chat'
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [showProjectPanel, setShowProjectPanel] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPDStats();
    fetchPDData();
  }, []);

  // Fetch filter options on mount and when domain changes
  useEffect(() => {
    fetchFilterOptions(filters.domain_id);
    // eslint-disable-next-line
  }, [filters.domain_id]);

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
    if (!sortConfig.key) return pdData;

    return [...pdData].sort((a, b) => {
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
  };

  // Enhanced project selection handler
  const handleProjectClick = async (projectId, projectName) => {
    if (selectedProject === projectId) {
      // If same project clicked, toggle off
      setSelectedProject(null);
      setProjectDetails(null);
      setShowProjectPanel(false);
    } else {
      // New project selected
      setSelectedProject(projectId);
      setShowProjectPanel(true);
      
      // Fetch detailed project information
      await fetchProjectDetails(projectId, projectName);
    }
  };

  // Fetch detailed project information
  const fetchProjectDetails = async (projectId, projectName) => {
    try {
      const response = await fetch(`http://localhost:5000/api/data/project-details?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjectDetails(data);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      // Create fallback project details
      setProjectDetails({
        project_name: projectName,
        total_runs: pdData.filter(row => row.project_id === projectId).length,
        recent_runs: pdData.filter(row => row.project_id === projectId).slice(0, 5),
        status_breakdown: {
          pass: pdData.filter(row => row.project_id === projectId && row.run_status === 'pass').length,
          fail: pdData.filter(row => row.project_id === projectId && row.run_status === 'fail').length,
          continue_with_error: pdData.filter(row => row.project_id === projectId && row.run_status === 'continue_with_error').length
        }
      });
    }
  };

  const fetchFilterOptions = async (domainId = '') => {
    try {
      const url = domainId
        ? `http://localhost:5000/api/data/filter-options?domain_id=${domainId}`
        : 'http://localhost:5000/api/data/filter-options';
      const response = await fetch(url, {
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
        limit: 5,
        offset: (currentPage - 1) * 5
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
        setTotalPages(Math.ceil(data.pagination.total / 5));
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
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
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
    setSelectedRow(selectedRow === index ? null : index);
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

  // Render project details panel
  const renderProjectPanel = () => {
    if (!showProjectPanel || !projectDetails) return null;

    return (
      <div className="project-details-panel">
        <div className="project-panel-header">
          <div className="project-panel-title">
            <h3>{projectDetails.project_name}</h3>
            <div className="project-meta">
              <span className="project-status-badge">Active Project</span>
              <span className="project-id">ID: {selectedProject}</span>
            </div>
          </div>
          <button 
            className="close-panel-btn"
            onClick={() => {
              setShowProjectPanel(false);
              setSelectedProject(null);
              setProjectDetails(null);
            }}
          >
            ✕
          </button>
        </div>
        
        <div className="project-panel-content">
          {/* Project Overview Stats */}
          <div className="project-overview-grid">
            <div className="project-stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h4>Total Runs</h4>
                <div className="stat-number">{projectDetails.total_runs || 0}</div>
                <div className="stat-trend">+12% from last week</div>
              </div>
            </div>
            
            <div className="project-stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h4>Passed</h4>
                <div className="stat-number success">{projectDetails.status_breakdown?.pass || 0}</div>
                <div className="stat-trend positive">+8% success rate</div>
              </div>
            </div>
            
            <div className="project-stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <h4>Failed</h4>
                <div className="stat-number danger">{projectDetails.status_breakdown?.fail || 0}</div>
                <div className="stat-trend negative">-5% failure rate</div>
              </div>
            </div>
            
            <div className="project-stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h4>Errors</h4>
                <div className="stat-number warning">{projectDetails.status_breakdown?.continue_with_error || 0}</div>
                <div className="stat-trend">Stable</div>
              </div>
            </div>
          </div>

          {/* Project Performance Metrics */}
          <div className="project-performance-section">
            <h4>Performance Metrics</h4>
            <div className="performance-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label">Average Runtime</span>
                  <span className="metric-value">{formatRuntime(projectDetails.avg_runtime || 0)}</span>
                </div>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((projectDetails.avg_runtime || 0) / 3600 * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label">Average Area</span>
                  <span className="metric-value">{(projectDetails.avg_area || 0).toFixed(2)} μm²</span>
                </div>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((projectDetails.avg_area || 0) / 1000 * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label">Utilization</span>
                  <span className="metric-value">{(projectDetails.avg_utilization || 0).toFixed(1)}%</span>
                </div>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${projectDetails.avg_utilization || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="project-charts-section">
            <h4>Run Status Distribution</h4>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Passed', value: projectDetails.status_breakdown?.pass || 0, color: '#16a34a' },
                      { name: 'Failed', value: projectDetails.status_breakdown?.fail || 0, color: '#dc2626' },
                      { name: 'Errors', value: projectDetails.status_breakdown?.continue_with_error || 0, color: '#f59e0b' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, value }) => `${name}: ${value}`}
                    dataKey="value"
                  >
                    {[
                      { name: 'Passed', value: projectDetails.status_breakdown?.pass || 0, color: '#16a34a' },
                      { name: 'Failed', value: projectDetails.status_breakdown?.fail || 0, color: '#dc2626' },
                      { name: 'Errors', value: projectDetails.status_breakdown?.continue_with_error || 0, color: '#f59e0b' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Recent Runs Table */}
          <div className="project-recent-runs">
            <h4>Recent Runs</h4>
            <div className="recent-runs-table">
              <div className="table-header">
                <div className="header-cell">Block</div>
                <div className="header-cell">Experiment</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Runtime</div>
                <div className="header-cell">User</div>
                <div className="header-cell">Date</div>
              </div>
              <div className="table-body">
                {projectDetails.recent_runs?.map((run, index) => (
                  <div key={index} className="table-row">
                    <div className="table-cell">{run.block_name}</div>
                    <div className="table-cell">{run.experiment}</div>
                    <div className="table-cell">
                      <span className={`status-badge ${getStatusColor(run.run_status)}`}>
                        {run.run_status}
                      </span>
                    </div>
                    <div className="table-cell">{formatRuntime(run.runtime_seconds)}</div>
                    <div className="table-cell">{run.user_name}</div>
                    <div className="table-cell">
                      {run.run_end_time ? new Date(run.run_end_time).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Timeline */}
          <div className="project-timeline">
            <h4>Project Timeline</h4>
            <div className="timeline-container">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <div className="timeline-date">First Run</div>
                  <div className="timeline-description">
                    {projectDetails.first_run ? new Date(projectDetails.first_run).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <div className="timeline-date">Latest Run</div>
                  <div className="timeline-description">
                    {projectDetails.last_run ? new Date(projectDetails.last_run).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="data-visualization">
      {/* Only render Project Details Panel if it should be visible */}
      {showProjectPanel && projectDetails && renderProjectPanel()}
      
      {/* Engineer View Header */}
      <div className="engineer-view-header">
        <div className="header-content">
          <h2>Engineer Dashboard</h2>
          <p>Data analysis and visualization for engineering workflows</p>
        </div>
      </div>
      
      <div className="viz-header">
        <div className="view-toggle-buttons">
          <button
            className={viewMode === 'detailed' ? 'active' : ''}
            onClick={() => setViewMode('detailed')}
          >
            Detailed View
          </button>
          <button
            className={viewMode === 'chat' ? 'active' : ''}
            onClick={() => setViewMode('chat')}
          >
            Chat View
          </button>
        </div>
        
        {/* Domain Filter Section */}
        <div className="domain-filter-section">
          <div className="domain-filter-header">
            <h3>Select Domain</h3>
            {filters.domain_id && (
              <div className="selected-domain">
                <span>Selected: {filterOptions.domains?.find(d => d.id === filters.domain_id)?.full_name}</span>
              </div>
            )}
          </div>
          <div className="domain-filter-control">
            <select
              value={filters.domain_id}
              onChange={(e) => handleFilterChange('domain_id', e.target.value)}
              className="domain-select"
            >
              <option value="">All Domains</option>
              {filterOptions.domains?.map(domain => (
                <option key={domain.id} value={domain.id}>{domain.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'charts' ? (
        <div className="charts-view-grid">
          {/* Bar Chart: Total Runs Over Time (if time data available) */}
          <div className="chart-card">
            <h4>Total Runs Over Time</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pdData.map(row => ({
                name: row.run_end_time ? row.run_end_time.split('T')[0] : 'N/A',
                total: 1
              })).reduce((acc, curr) => {
                const found = acc.find(a => a.name === curr.name);
                if (found) found.total += 1;
                else acc.push({ ...curr });
                return acc;
              }, [])}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart: Pass/Fail Distribution */}
          <div className="chart-card">
            <h4>Pass/Fail Distribution</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Passed', value: stats?.overall_stats?.passed_runs || 0 },
                    { name: 'Failed', value: stats?.overall_stats?.failed_runs || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                  dataKey="value"
                >
                  <Cell key="passed" fill="#16a34a" />
                  <Cell key="failed" fill="#dc2626" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart: Average Runtime Over Time (if available) */}
          <div className="chart-card">
            <h4>Average Runtime Over Time</h4>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={pdData.map(row => ({
                name: row.run_end_time ? row.run_end_time.split('T')[0] : 'N/A',
                runtime: row.avg_runtime ? parseFloat(row.avg_runtime) : null
              })).filter(row => row.runtime !== null)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="runtime" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : viewMode === 'chat' ? (
        <ChatView data={pdData} stats={stats} />
              ) : (
        <>

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
            
            <div className="stat-card stat-card--secondary animated stagger-6">
              <div className="stat-card__icon bounce-in">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-card__content">
                <h3>Active Projects</h3>
                <div className="stat-number">
                  <AnimatedNumber value={filterOptions.projects?.length || 0} />
                </div>
                <div className="stat-unit">projects</div>
              </div>
            </div>
          </div>

          {/* Data Table Section with Secondary Filters */}
          <div className={`data-table-section ${isFullScreen ? 'fullscreen-table' : ''}`}>
            <div className="table-header">
              <div className="table-header-content">
                <h3>
                  {(() => {
                    if (filters.domain_id) {
                      const selectedDomain = filterOptions.domains?.find(d => d.id === filters.domain_id);
                      if (selectedDomain) {
                        if (selectedDomain.full_name.toLowerCase().includes('physical design')) {
                          return 'PD Run Data';
                        }
                        return `${selectedDomain.full_name} Run Data`;
                      }
                    }
                    return 'Run Data';
                  })()}
                </h3>
                
                <div className="table-actions">
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
                  <div className="filter-item">
                    <label>Project</label>
                    <select
                      value={filters.project_id}
                      onChange={(e) => handleFilterChange('project_id', e.target.value)}
                    >
                      <option value="">All Projects</option>
                      {filterOptions.projects?.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
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
                        project_id: '',
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProjectClick(row.project_id, row.project_name);
                                  }}
                                >
                                  <span className="cell-text">{row.project_name || 'N/A'}</span>
                                  <div className="project-indicator">
                                    {selectedProject === row.project_id ? '🔍' : '📋'}
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
                            </tr>
                            
                            {/* Expanded Row Details */}
                            {selectedRow === index && (
                              <tr className="expanded-row">
                                <td colSpan="25">
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
              <h3>Stage-wise Statistics</h3>
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
        </>
      )}
    </div>
  );
};

export default DataVisualization; 