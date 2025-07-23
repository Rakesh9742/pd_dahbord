import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DVDataPage from './components/DVDataPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      // Optionally handle error, but still log out locally
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <nav style={{ padding: 10, background: '#f5f5f5' }}>
          <Link to="/">Dashboard</Link> |{' '}
          <Link to="/dv-data">DV Data</Link>
        </nav>
        <Routes>
          <Route path="/dv-data" element={<DVDataPage />} />
          <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 