const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-pictures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Register route (for creating admin user)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role_name } = req.body;

    // Validate input
    if (!name || !email || !password || !role_name) {
      return res.status(400).json({ message: 'Name, email, password, and role_name are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Get role ID
    const [roles] = await pool.execute(
      'SELECT id FROM user_roles WHERE role_name = ?',
      [role_name]
    );

    if (roles.length === 0) {
      return res.status(400).json({ message: 'Invalid role. Available roles: Admin, Engineer, Lead, Program Manager, Customer' });
    }

    const roleId = roles[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, roleId]
    );

    // Get created user with role
    const [newUsers] = await pool.execute(
      'SELECT u.*, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [result.insertId]
    );

    const newUser = newUsers[0];
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT u.*, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role_name,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    // Add project_ids for customers
    if (user.role_name === 'Customer') {
      const [projectRows] = await pool.execute(
        'SELECT project_id FROM project_users WHERE user_id = ? AND is_active = 1',
        [user.id]
      );
      userWithoutPassword.project_ids = projectRows.map(row => row.project_id);
    }
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;

    // Update user's profile picture in database
    await pool.execute(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePicturePath, req.user.userId]
    );

    // Get updated user data
    const [users] = await pool.execute(
      'SELECT u.*, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Profile picture uploaded successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT u.id, u.name, u.email, u.profile_picture, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Add project_ids for customers
    if (user.role_name === 'Customer') {
      const [projectRows] = await pool.execute(
        'SELECT project_id FROM project_users WHERE user_id = ? AND is_active = 1',
        [user.id]
      );
      user.project_ids = projectRows.map(row => row.project_id);
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 