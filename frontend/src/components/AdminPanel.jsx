import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_name: '',
    project_ids: []
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    console.log('AdminPanel: Fetching users, roles, and projects...');
    fetchUsers();
    fetchRoles();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('AdminPanel: Fetching users with token:', token ? 'Token exists' : 'No token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('AdminPanel: Users response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('AdminPanel: Users fetch error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('AdminPanel: Users fetched successfully:', data.users.length, 'users');
      setUsers(data.users);
    } catch (error) {
      console.error('AdminPanel: Users fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/data/filter-options', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProjectChange = (projectId) => {
    const currentProjectIds = formData.project_ids || [];
    const updatedProjectIds = currentProjectIds.includes(projectId)
      ? currentProjectIds.filter(id => id !== projectId)
      : [...currentProjectIds, projectId];
    
    setFormData({
      ...formData,
      project_ids: updatedProjectIds
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role_name: '',
      project_ids: []
    });
    setEditingUser(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.id}`
        : 'http://localhost:5000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { ...formData, password: undefined } // Don't send password for updates
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      // Refresh users list
      await fetchUsers();
      resetForm();
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_name: user.role_name,
      project_ids: user.project_ids || []
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      await fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !user.is_active
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      await fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>User Management</h2>
        <button 
          className="add-user-btn"
          onClick={() => {
            setEditingUser(null);
            setFormData({
              name: '',
              email: '',
              password: '',
              role_name: '',
              project_ids: []
            });
            setShowAddForm(true);
          }}
        >
          + Add New User
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="user-form-overlay">
          <div className="user-form-card">
            <div className="form-header">
              <div className="form-header-accent"></div>
              <h3>{editingUser ? 'Edit User' : 'Add New User'} <span role="img" aria-label="user">👤</span></h3>
              <button className="close-btn" onClick={resetForm} title="Close">×</button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <div className="input-icon-group">
                  <span className="input-icon" role="img" aria-label="name">📝</span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-divider"></div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-icon-group">
                  <span className="input-icon" role="img" aria-label="email">✉️</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-divider"></div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-icon-group">
                  <span className="input-icon" role="img" aria-label="password">🔒</span>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder={editingUser ? "Leave blank to keep current password" : ""}
                  />
                </div>
                <div className="input-info">{editingUser && 'Leave blank to keep current password.'}</div>
              </div>
              <div className="form-divider"></div>
              <div className="form-group">
                <label htmlFor="role_name">Role</label>
                <div className="input-icon-group">
                  <span className="input-icon" role="img" aria-label="role">🏷️</span>
                  <select
                    id="role_name"
                    name="role_name"
                    value={formData.role_name}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.role_name}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
                  </div>
                  </div>
                  
                  {formData.role_name === 'Customer' && (
                  <>
                  <div className="form-divider"></div>
                  <div className="form-group">
                  <label htmlFor="project_ids">Select Projects</label>
                  <div className="input-icon-group">
                  <span className="input-icon" role="img" aria-label="project">🗂️</span>
                  <div className="checkbox-container" style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '12px',
                    backgroundColor: '#f8fafc'
                  }}>
                  {projects && projects.length > 0 ? (
                    projects.map(project => (
                      <div key={project.id} className="checkbox-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: formData.project_ids.includes(project.id) ? '#e0f2fe' : 'transparent',
                        border: formData.project_ids.includes(project.id) ? '1px solid #0288d1' : '1px solid transparent'
                      }}>
                        <input
                          type="checkbox"
                          id={`project-${project.id}`}
                          checked={formData.project_ids.includes(project.id)}
                          onChange={() => handleProjectChange(project.id)}
                          style={{ marginRight: '8px' }}
                        />
                        <label 
                          htmlFor={`project-${project.id}`}
                          style={{ 
                            cursor: 'pointer',
                            fontWeight: formData.project_ids.includes(project.id) ? '600' : '400',
                            color: formData.project_ids.includes(project.id) ? '#0288d1' : '#374151'
                          }}
                        >
                          {project.project_name}
                        </label>
                      </div>
                    ))
                  ) : null}
                  </div>
                  </div>
                  <div className="input-info">
                    {formData.project_ids.length > 0 ? 
                      `Selected: ${formData.project_ids.length} project(s)` : 
                      'No projects selected'
                    }
                  </div>
                  {loading && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Loading projects...</div>}
                  {!loading && projects && projects.length === 0 && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>No projects available</div>}
                  </div>
                  </>
                  )}
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Assigned Projects</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role_name.toLowerCase().replace(' ', '-')}`}>
                    {user.role_name}
                  </span>
                </td>
                <td>
                  {user.project_ids && user.project_ids.length > 0 ? 
                    user.project_ids.map(id => {
                      const project = projects.find(p => p.id === id);
                      return project ? 
                        <span key={id} className="project-badge">{project.project_name}</span> : null;
                    }) : 
                    <span className="no-projects">None</span>
                  }
                </td>
                <td>
                  <button
                    className={`status-toggle ${user.is_active ? 'active' : 'inactive'}`}
                    onClick={() => toggleUserStatus(user)}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="clear-btn"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      className={user.is_active ? "deactivate-btn" : "activate-btn"}
                      onClick={() => toggleUserStatus(user)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;