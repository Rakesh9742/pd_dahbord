import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import AdminPanel from './AdminPanel';
import DataVisualization from './DataVisualization';
import LogsMenu from './DuplicateErrorLogsMenu';
import LogsNavigation from './LogsNavigation';
import ManagerView from './ManagerView';
import LeadView from './LeadView';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [chartData, setChartData] = useState({
    runTrends: [],
    statusDistribution: [],
    projectPerformance: [],
    weeklyStats: []
  });

  const token = localStorage.getItem('token');

  // Fetch dashboard stats only once on component mount (unfiltered)
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetch chart data when date filter changes (filtered)
  useEffect(() => {
    fetchChartData();
  }, [dateFilter]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch stats without date filter - showing overall totals
      const response = await fetch(`http://localhost:5000/api/data/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/data/chart-data?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetDateFilter = () => {
    setDateFilter({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  const getAvailableViews = () => {
    const views = [
      { id: 'overview', label: 'Overview', icon: '📊' },
      { id: 'engineer', label: 'Engineer View', icon: '⚙️' },
      { id: 'lead', label: 'Lead View', icon: '👥' },
      { id: 'manager', label: 'Manager View', icon: '📈' },
      { id: 'logs', label: 'Logs', icon: '📝' }
    ];

    if (user?.role_name === 'Admin') {
      views.push({ id: 'admin', label: 'Admin Panel', icon: '👑' });
    }

    return views;
  };

  const renderDashboardContent = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview 
          user={user} 
          stats={dashboardStats} 
          chartData={chartData}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterChange}
          onResetDateFilter={resetDateFilter}
        />;
      case 'engineer':
        return <DataVisualization />;
      case 'lead':
        return <LeadView user={user} />;
      case 'manager':
        return <ManagerView user={user} />;
      case 'admin':
        return <AdminPanel />;
      case 'logs':
        return <LogsNavigation />;
      default:
        return <DashboardOverview 
          user={user} 
          stats={dashboardStats} 
          chartData={chartData}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterChange}
          onResetDateFilter={resetDateFilter}
        />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-container">
          {/* Logo and Brand */}
          <div className="navbar-brand">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
              </svg>
            </div>
            <h3>EDA Dashboard</h3>
          </div>

          {/* Navigation Menu */}
          <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
            {getAvailableViews().map((view) => (
              <button
                key={view.id}
                className={`nav-item ${activeView === view.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveView(view.id);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="nav-icon">{view.icon}</span>
                <span className="nav-label">{view.label}</span>
              </button>
            ))}
          </div>

          {/* User Section */}
          <div className="navbar-user">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role_name}</div>
              </div>
              <button onClick={onLogout} className="logout-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
                </svg>
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Only render the content-header for non-overview views */}
        {activeView !== 'overview' && (
          <header className="content-header">
            <div className="header-content">
              <div className="header-left">
                <h1>{getAvailableViews().find(v => v.id === activeView)?.label}</h1>
              </div>
              <div className="header-actions">
                {/* Additional header actions can be added here */}
              </div>
            </div>
          </header>
        )}
        <main className="content-body">
          {renderDashboardContent()}
        </main>
      </div>
    </div>
  );
};

// Enhanced Dashboard Overview Component with Charts
const DashboardOverview = ({ user, stats, chartData, dateFilter, onDateFilterChange, onResetDateFilter }) => {
  const COLORS = ['#28c76f', '#ea5455', '#ff9f43', '#7367f0'];

  return (
    <div className="dashboard-overview">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h2>Welcome back, {user?.name}! 👋</h2>
          <p>Here's what's happening with your projects today</p>
        </div>
        <div className="welcome-stats">
          <div className="quick-stat">
            <span className="stat-number">{stats.totalProjects || 0}</span>
            <span className="stat-label">Active Projects</span>
          </div>
          <div className="quick-stat">
            <span className="stat-number">{stats.completedRuns || 0}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="quick-stat">
            <span className="stat-number">{stats.failedRuns || 0}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-trend positive">+12%</div>
          </div>
          <div className="stat-content">
            <h3>Total Projects</h3>
            <p className="stat-number">{stats.totalProjects || 0}</p>
            <p className="stat-description">Active projects (overall total)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-trend positive">+15%</div>
          </div>
          <div className="stat-content">
            <h3>Completed Runs</h3>
            <p className="stat-number">{stats.completedRuns || 0}</p>
            <p className="stat-description">Runs completed (overall total)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-trend negative">-5%</div>
          </div>
          <div className="stat-content">
            <h3>Failed Runs</h3>
            <p className="stat-number">{stats.failedRuns || 0}</p>
            <p className="stat-description">Runs with errors (overall total)</p>
          </div>
        </div>
      </div>

      {/* Date Filter Section - Only for Charts */}
      <div className="date-filter-section">
        <div className="filter-header">
          <h3>📊 Chart Date Range Filter</h3>
          <p className="filter-description">Filter charts by date range (stats cards show overall totals)</p>
          <button onClick={onResetDateFilter} className="reset-filter-btn">
            Reset to Last 7 Days
          </button>
        </div>
        <div className="filter-controls">
          <div className="date-input-group">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              value={dateFilter.startDate}
              onChange={(e) => onDateFilterChange('startDate', e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">End Date:</label>
            <input
              type="date"
              id="endDate"
              value={dateFilter.endDate}
              onChange={(e) => onDateFilterChange('endDate', e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="charts-grid">
          {/* Run Trends Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Run Trends (Filtered by Date Range)</h3>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#28c76f' }}></span>
                  Completed
                </span>
                <span className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ea5455' }}></span>
                  Failed
                </span>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.runTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    stroke="#b4b7bd"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#b4b7bd"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(40, 48, 70, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#d0d2d6'
                    }}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#28c76f" 
                    fill="#28c76f" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    stackId="1"
                    stroke="#ea5455" 
                    fill="#ea5455" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
              </div>

          {/* Status Distribution Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Run Status Distribution (Filtered)</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(40, 48, 70, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#d0d2d6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Performance Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Project Performance (Filtered)</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.projectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="project" 
                    stroke="#b4b7bd"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#b4b7bd"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(40, 48, 70, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#d0d2d6'
                    }}
                  />
                  <Bar dataKey="runs" fill="#7367f0" />
                </BarChart>
              </ResponsiveContainer>
        </div>
          </div>

          {/* Weekly Statistics Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Weekly Statistics (Filtered)</h3>
              </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData.weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#b4b7bd"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#b4b7bd"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(40, 48, 70, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#d0d2d6'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalRuns" 
                    stroke="#7367f0" 
                    strokeWidth={2}
                    dot={{ fill: '#7367f0', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#28c76f" 
                    strokeWidth={2}
                    dot={{ fill: '#28c76f', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
 