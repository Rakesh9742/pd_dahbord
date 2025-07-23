import React, { useState, useRef } from 'react';
import './UserProfilePage.css';

const UserProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const fileInputRef = useRef(null);

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

  const handleEditSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement profile update logic
    console.log('Profile update:', editForm);
    setIsEditing(false);
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();
      // Update the user data in localStorage
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...currentUser, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update user data in parent components
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="user-profile-page">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Main Content */}
      <div className="profile-content">
        {/* User Info Card */}
        <div className="user-info-card">
          <div 
            className={`user-avatar-large ${uploading ? 'uploading' : ''}`}
            onClick={handleProfilePictureClick}
            title="Click to upload profile picture"
          >
            {user?.profile_picture ? (
              <img 
                src={`http://localhost:5000${user.profile_picture}`} 
                alt="Profile" 
                className="profile-picture"
              />
            ) : (
              getUserInitials(user?.name)
            )}
            {uploading && <div className="upload-overlay">Uploading...</div>}
            <div className="avatar-upload-icon">📷</div>
          </div>
          <div className="user-info-details">
            <h2>{user?.name || 'User'}</h2>
            <p className="user-email">{user?.email || 'user@example.com'}</p>
            <div className="user-badges">
              <span className="role-badge">{user?.role_name || 'User'}</span>
              <span className={`status-badge ${user?.is_active ? 'active' : 'inactive'}`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="section-header">
                <h3>Profile Information</h3>
                <button 
                  className="edit-btn"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="edit-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Save Changes</button>
                    <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{user?.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email Address</span>
                    <span className="info-value">{user?.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role</span>
                    <span className="info-value">{user?.role_name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className={`info-value status-${user?.is_active ? 'active' : 'inactive'}`}>
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Member Since</span>
                    <span className="info-value">{formatDate(user?.created_at)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <h3>Account Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>Email Notifications</h4>
                    <p>Receive email notifications for important updates</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>Dark Mode</h4>
                    <p>Switch to dark theme for better viewing</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage; 