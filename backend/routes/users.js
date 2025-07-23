const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [req.user.userId]
    );

    if (users.length === 0 || users[0].role_name !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.role_name, COALESCE((SELECT JSON_ARRAYAGG(project_id) FROM project_users pu WHERE pu.user_id = u.id AND pu.is_active = 1), JSON_ARRAY()) AS project_ids FROM users u JOIN user_roles r ON u.role_id = r.id ORDER BY u.created_at DESC'
    );

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
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
      'SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [result.insertId]
    );
    // Assign projects to customer if provided
    const projectIds = req.body.project_ids;
    if (role_name === 'Customer' && Array.isArray(projectIds)) {
      for (const pid of projectIds) {
        await pool.execute(
          'INSERT IGNORE INTO project_users (project_id, user_id) VALUES (?, ?)',
          [pid, result.insertId]
        );
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      user: newUsers[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role_name, is_active } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get role ID if role_name is provided
    let roleId = null;
    if (role_name) {
      const [roles] = await pool.execute(
        'SELECT id FROM user_roles WHERE role_name = ?',
        [role_name]
      );

      if (roles.length === 0) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      roleId = roles[0].id;
    }

    // Build update query
    const updates = [];
    const values = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (roleId) {
      updates.push('role_id = ?');
      values.push(roleId);
    }
    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    await pool.execute(query, values);

    // Get updated user
    const [updatedUsers] = await pool.execute(
      'SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.role_name FROM users u JOIN user_roles r ON u.role_id = r.id WHERE u.id = ?',
      [id]
    );

    // Handle project assignments for customers if provided
    const projectIds = req.body.project_ids;
    if (role_name === 'Customer' && Array.isArray(projectIds)) {
      // Remove existing assignments
      await pool.execute('DELETE FROM project_users WHERE user_id = ?', [id]);
      // Assign new projects
      for (const pid of projectIds) {
        await pool.execute(
          'INSERT IGNORE INTO project_users (project_id, user_id) VALUES (?, ?)',
          [pid, id]
        );
      }
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUsers[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hard delete: actually remove the user
    await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all roles
router.get('/roles', auth, requireAdmin, async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT id, role_name, description FROM user_roles ORDER BY role_name'
    );

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 