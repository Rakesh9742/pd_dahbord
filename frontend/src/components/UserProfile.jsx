import React, { useState, useRef, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = ({ user, onLogout, isOpen, onClose }) => {
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="user-profile-overlay">
      <div className="user-profile-modal" ref={modalRef}>
        <div className="profile-header">
          <div className="profile-avatar-large">
            {getUserInitials(user?.name)}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{user?.name || 'User'}</h2>
            <p className="profile-role">{user?.role_name || 'User Role'}</p>
            <p className="profile-email">{user?.email || 'user@example.com'}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>Account Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">User ID:</span>
                <span className="detail-value">{user?.id || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{user?.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Role:</span>
                <span className="detail-value role-badge">{user?.role_name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${user?.is_active ? 'active' : 'inactive'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Member Since:</span>
                <span className="detail-value">{formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>

          {user?.role_name === 'Customer' && user?.project_ids && (
            <div className="detail-section">
              <h3>Assigned Projects</h3>
              <div className="project-list">
                {user.project_ids.length > 0 ? (
                  user.project_ids.map((projectId, index) => (
                    <div key={index} className="project-item">
                      <span className="project-id">Project #{projectId}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-projects">No projects assigned</p>
                )}
              </div>
            </div>
          )}

          <div className="profile-actions">
            <button className="action-btn primary" onClick={() => {
              // TODO: Add edit profile functionality
              console.log('Edit profile clicked');
            }}>
              Edit Profile
            </button>
            <button className="action-btn secondary" onClick={() => {
              // TODO: Add change password functionality
              console.log('Change password clicked');
            }}>
              Change Password
            </button>
            <button className="action-btn danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 