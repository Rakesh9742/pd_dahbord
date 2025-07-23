const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dataRoutes = require('./routes/data');
const duplicateErrorsRoutes = require('./routes/duplicateErrors');
const FileWatcher = require('./utils/fileWatcher');
const dvDataRoute = require('./routes/dvData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Test database connection
testConnection();

// Initialize file watcher
const { pool } = require('./config/database');
const fileWatcher = new FileWatcher(pool);

// Start file watcher
fileWatcher.startWatching().then(() => {
  console.log('📁 File watcher initialized successfully');
}).catch(error => {
  console.error('❌ Error initializing file watcher:', error);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/data', duplicateErrorsRoutes);
app.use('/api/dv-data', dvDataRoute);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'EDA Dashboard API is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 EDA Dashboard API: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});