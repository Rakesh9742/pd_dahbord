import React, { useState } from 'react';
import './Dashboard.css';
import AdminPanel from './AdminPanel';
import DataVisualization from './DataVisualization';
import LogsNavigation from './LogsNavigation';
import ManagerView from './ManagerView';
import LeadView from './LeadView';
import CustomerView from './CustomerView';
import ProjectFilter from './ProjectFilter';
import SlideBar from './SlideBar';
import UserProfilePage from './UserProfilePage';
import DVManagerView from './DVManagerView';
import DVLeadView from './DVLeadView';

function Dashboard({ user, onLogout, onUserUpdate }) {
  const [activeView, setActiveView] = useState(null); // No view by default
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectFilters, setProjectFilters] = useState({ domain_id: '', project_id: '' });
  const [clickedButton, setClickedButton] = useState(null);
  const [showProfilePage, setShowProfilePage] = useState(false);

  // Check if user is a customer
  const isCustomer = user?.role_name === 'Customer';

  // Handle profile click from sidebar
  const handleProfileClick = () => {
    setShowProfilePage(true);
    setActiveView('profile'); // Set profile as active view
  };

  // Handle user data update from profile page
  const handleUserUpdate = (updatedUser) => {
    // Update user in localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    // Update user state in parent component
    if (typeof onUserUpdate === 'function') {
      onUserUpdate(updatedUser);
    }
  };

  // Handle view change with animation
  const handleViewChange = (viewId) => {
    setClickedButton(viewId);
    setActiveView(viewId);
    setShowProfilePage(false); // Hide profile page when switching views
    setTimeout(() => {
      setClickedButton(null);
    }, 300);
  };

  // Only show Engineer, Lead, Manager as view tabs (not for customers)
  const getTabViews = () => {
    if (isCustomer) {
      return [];
    }
    // If DV domain is selected, only show Manager and Lead views
    if (projectFilters.domain_id === '3' || projectFilters.domain_id === 3) {
      return [
        { id: 'manager', label: 'Manager View', icon: '📈' },
        { id: 'lead', label: 'Lead View', icon: '👥' }
      ];
    }
    const views = [];
    if (projectFilters.domain_id) {
      views.push(
        { id: 'engineer', label: 'Engineer View', icon: '⚙️' },
        { id: 'lead', label: 'Lead View', icon: '👥' },
        { id: 'manager', label: 'Manager View', icon: '📈' }
      );
    }
    return views;
  };

  // Admin Panel and Logs only from sidebar (not for customers)
  const renderDashboardContent = () => {
    if (showProfilePage) {
      return <UserProfilePage user={user} onLogout={onLogout} onUserUpdate={handleUserUpdate} />;
    }
    if (isCustomer) {
      return <CustomerView user={user} projectFilters={projectFilters} />;
    }
    if (activeView === 'admin') return <AdminPanel />;
    if (activeView === 'logs') return <LogsNavigation />;
    // DV domain-specific views
    if ((projectFilters.domain_id === '3' || projectFilters.domain_id === 3)) {
      if (activeView === 'manager') return <DVManagerView filters={projectFilters} />;
      if (activeView === 'lead') return <DVLeadView filters={projectFilters} />;
    }
    if (!activeView) {
      return (
        <div className="no-view-selected">
          <div className="no-view-content">
            <div className="welcome-message">
              <h2>Welcome to the Dashboard</h2>
              <p>Please select a view from the sidebar or choose Engineer, Lead, or Manager to see dashboard data.</p>
              <div className="welcome-actions">
                <div className="welcome-tips">
                  <div className="tip-item">
                    <span className="tip-icon">⚙️</span>
                    <span><strong>Engineer View:</strong> Detailed technical metrics and data visualization</span>
                  </div>
                  <div className="tip-item">
                    <span className="tip-icon">👥</span>
                    <span><strong>Lead View:</strong> Team management and project oversight</span>
                  </div>
                  <div className="tip-item">
                    <span className="tip-icon">📈</span>
                    <span><strong>Manager View:</strong> Project analytics and summary</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (activeView === 'engineer') return <DataVisualization projectFilters={projectFilters} />;
    if (activeView === 'manager') return <ManagerView user={user} projectFilters={projectFilters} />;
    if (activeView === 'lead') return <LeadView user={user} projectFilters={projectFilters} />;
    return null;
  };

  return (
    <div className={`dashboard-container${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      <SlideBar
        onViewChange={handleViewChange}
        activeView={activeView}
        getTabViews={getTabViews}
        onProfileClick={handleProfileClick}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        user={user}
        onLogout={onLogout}
      />
      <div className="dashboard-content">
        {!(activeView === 'admin' || activeView === 'logs') && (
          <ProjectFilter
            onFilterChange={setProjectFilters}
            selectedFilters={projectFilters}
            activeView={activeView}
            onViewChange={handleViewChange}
            isCustomer={isCustomer}
            getTabViews={getTabViews}
          />
        )}
        {renderDashboardContent()}
      </div>
    </div>
  );
}

export default Dashboard;
 