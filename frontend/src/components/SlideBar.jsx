import React from 'react';
import './SlideBar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'admin', label: 'Admin Panel', icon: '👑' },
  { id: 'logs', label: 'Logs', icon: '📝' },
];

const SlideBar = ({ activeView, onViewChange, user, open, setOpen, onLogout, onProfileClick }) => {
  // Only show admin/logs for admin
  const filteredNav = navItems.filter(item => {
    if ((item.id === 'admin' || item.id === 'logs') && user?.role_name !== 'Admin') return false;
    return true;
  });

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`sidebar-left${open ? ' open' : ' collapsed'}`}>  
      <div className="sidebar-toggle" onClick={() => setOpen(!open)}>
        {open ? <span>&#x25C0;</span> : <span>&#9776;</span>}
      </div>
      
      {/* User Profile Section - Clickable */}
      {user && (
        <div className="sidebar-user-profile clickable" onClick={onProfileClick}>
          <div className="sidebar-user-avatar">
            {user?.profile_picture ? (
              <img 
                src={`http://localhost:5000${user.profile_picture}`} 
                alt="Profile" 
                className="sidebar-profile-picture"
              />
            ) : (
              getUserInitials(user.name)
            )}
          </div>
          {open && (
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role_name}</div>
            </div>
          )}
        </div>
      )}
      
      <div className="sidebar-nav">
        {filteredNav.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-btn${activeView === item.id ? ' active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {open && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
        
        {/* Logout Button */}
        <div className="sidebar-logout-section">
          <button
            className="sidebar-nav-btn logout-btn"
            onClick={onLogout}
            title="Logout"
          >
            <span className="nav-icon">🚪</span>
            {open && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideBar; 