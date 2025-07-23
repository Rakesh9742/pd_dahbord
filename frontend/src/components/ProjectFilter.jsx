import React, { useState, useEffect } from 'react';
import './ProjectFilter.css';

const ProjectFilter = ({ onFilterChange, selectedFilters, activeView, onViewChange, isCustomer, getTabViews }) => {
  const [projects, setProjects] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clickedButton, setClickedButton] = useState(null);
  const [viewSelected, setViewSelected] = useState(false); // New state to track if a view is selected

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProjects();
  }, []);

  // For customers, automatically select the first project if none is selected
  useEffect(() => {
    if (isCustomer && projects.length > 0 && !selectedFilters.project_id) {
      const firstProject = projects[0];
      handleFilterChange('project_id', firstProject.id);
    }
  }, [isCustomer, projects, selectedFilters.project_id]);

  useEffect(() => {
    if (selectedFilters.project_id) {
      fetchDomains(selectedFilters.project_id);
    } else {
      setDomains([]);
    }
  }, [selectedFilters.project_id]);

  // Track when a view is selected
  useEffect(() => {
    setViewSelected(activeView !== null && activeView !== 'admin' && activeView !== 'logs');
  }, [activeView]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/data/filter-options', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async (projectId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/data/filter-options?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch domains');
      const data = await response.json();
      setDomains(data.domains || []);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...selectedFilters };
    if (filterType === 'project_id') {
      newFilters.project_id = value;
      newFilters.domain_id = '';
    } else if (filterType === 'domain_id') {
      newFilters.domain_id = value;
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    if (isCustomer) {
      // For customers, only clear domain filter, keep the first project selected
      onFilterChange({
        project_id: selectedFilters.project_id || (projects.length > 0 ? projects[0].id : ''),
        domain_id: ''
      });
    } else {
    onFilterChange({
      project_id: '',
      domain_id: ''
    });
    }
  };

  const handleViewChange = (viewId) => {
    setClickedButton(viewId);
    onViewChange(viewId);
    
    // Reset the clicked state after animation
    setTimeout(() => {
      setClickedButton(null);
    }, 300);
  };

  if (loading) {
    return (
      <div className="project-filter-loading">
        <div className="loading-spinner"></div>
        <p>Loading filter options...</p>
      </div>
    );
  }

  return (
    <div className={`project-filter-container ${selectedFilters.project_id || selectedFilters.domain_id ? 'filters-active' : ''} ${viewSelected ? 'view-selected' : ''}`}>
      {viewSelected ? (
        // Show compact view button when a view is selected
        <div className="view-button-container">
          <div className="view-button-info">
            <span className="view-button-project">
              {projects.find(p => p.id === parseInt(selectedFilters.project_id))?.project_name || 'Project'}
            </span>
            {selectedFilters.domain_id && (
              <span className="view-button-domain">
                • {domains.find(d => d.id === parseInt(selectedFilters.domain_id))?.full_name || 'Domain'}
              </span>
            )}
          </div>
          <div className="view-button-actions">
            <button
              className="view-button-change"
              onClick={() => setViewSelected(false)}
            >
              Change Filters
            </button>
            <button
              className="view-button-clear"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        // Show full filter controls when no view is selected
        <>
          <div className="filter-controls">
            {/* Always show project dropdown */}
            <div className="filter-group">
              <label htmlFor="project-select">Project:</label>
              <select
                id="project-select"
                value={selectedFilters.project_id || ''}
                onChange={(e) => handleFilterChange('project_id', e.target.value)}
                className="filter-select"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>
            {selectedFilters.project_id && domains.length > 0 && (
              <div className="filter-group">
                <label htmlFor="domain-select">Domain:</label>
                <select
                  id="domain-select"
                  value={selectedFilters.domain_id || ''}
                  onChange={(e) => handleFilterChange('domain_id', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Domains</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={clearFilters}
              className="clear-filters-btn"
              disabled={!selectedFilters.project_id && !selectedFilters.domain_id}
            >
              Clear Filters
            </button>
          </div>
          
          {/* View Navigation Tabs - Only show for non-customers when domain is selected */}
          {!isCustomer && getTabViews().length > 0 && (
            <div className="view-nav">
              {getTabViews().map(view => (
                <button
                  key={view.id}
                  className={`view-nav-btn${activeView === view.id ? ' active' : ''}${clickedButton === view.id ? ' clicked' : ''}`}
                  onClick={() => handleViewChange(view.id)}
                >
                  <span className="view-nav-icon">{view.icon}</span>
                  <span className="view-nav-label">{view.label}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      
      {error && (
        <div className="filter-error">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectFilter; 