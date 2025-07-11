const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');



// Get PD data with filters
router.get('/pd-data', auth, async (req, res) => {
  try {
    const {
      project_id,
      block_name,
      experiment,
      stage,
      run_status,
      user_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0,
      domain_id
    } = req.query;

    let query = `
      SELECT 
        pd.*,
        p.project_name,
        u.name as user_name,
        d.full_name as domain_name
      FROM pd_data_raw pd
      JOIN projects p ON pd.project_id = p.id
      JOIN users u ON pd.user_id = u.id
      JOIN domains d ON pd.domain_id = d.id
      WHERE 1=1
    `;

    const params = [];

    if (project_id) {
      query += ' AND pd.project_id = ?';
      params.push(project_id);
    }

    if (block_name) {
      query += ' AND pd.block_name LIKE ?';
      params.push(`%${block_name}%`);
    }

    if (experiment) {
      query += ' AND pd.experiment LIKE ?';
      params.push(`%${experiment}%`);
    }

    if (stage) {
      query += ' AND pd.stage = ?';
      params.push(stage);
    }

    if (run_status) {
      query += ' AND pd.run_status = ?';
      params.push(run_status);
    }

    if (user_id) {
      query += ' AND pd.user_id = ?';
      params.push(user_id);
    }

    if (domain_id) {
      query += ' AND pd.domain_id = ?';
      params.push(domain_id);
    }

    if (start_date) {
      query += ' AND pd.run_end_time >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pd.run_end_time <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY pd.run_end_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [data] = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countQueryWithoutLimit = countQuery.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '');
    const [countResult] = await pool.query(countQueryWithoutLimit, params.slice(0, -2));

    res.json({
      success: true,
      data,
      pagination: {
        total: countResult[0]?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching PD data:', error);
    res.status(500).json({
      error: 'Error fetching PD data',
      details: error.message
    });
  }
});

// Get PD data statistics
router.get('/pd-stats', auth, async (req, res) => {
  try {
    const {
      project_id,
      block_name,
      experiment,
      stage,
      run_status,
      user_id,
      start_date,
      end_date,
      domain_id
    } = req.query;

    // Build WHERE clause for filters
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (project_id) {
      whereClause += ' AND project_id = ?';
      params.push(project_id);
    }

    if (block_name) {
      whereClause += ' AND block_name LIKE ?';
      params.push(`%${block_name}%`);
    }

    if (experiment) {
      whereClause += ' AND experiment LIKE ?';
      params.push(`%${experiment}%`);
    }

    if (stage) {
      whereClause += ' AND stage = ?';
      params.push(stage);
    }

    if (run_status) {
      whereClause += ' AND run_status = ?';
      params.push(run_status);
    }

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }

    if (domain_id) {
      whereClause += ' AND domain_id = ?';
      params.push(domain_id);
    }

    if (start_date) {
      whereClause += ' AND run_end_time >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND run_end_time <= ?';
      params.push(end_date);
    }

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_runs,
        COUNT(CASE WHEN run_status = 'pass' THEN 1 END) as passed_runs,
        COUNT(CASE WHEN run_status = 'fail' THEN 1 END) as failed_runs,
        COUNT(CASE WHEN run_status = 'continue_with_error' THEN 1 END) as error_runs,
        COUNT(DISTINCT project_id) as total_projects,
        COUNT(DISTINCT block_name) as total_blocks,
        COUNT(DISTINCT user_id) as total_users,
        AVG(area_um2) as avg_area,
        AVG(inst_count) as avg_inst_count,
        AVG(utilization) as avg_utilization,
        AVG(runtime_seconds) as avg_runtime
      FROM pd_data_raw
      ${whereClause}
    `, params);

    const stageStats = await pool.query(`
      SELECT 
        stage,
        COUNT(*) as count,
        COUNT(CASE WHEN run_status = 'pass' THEN 1 END) as passed,
        COUNT(CASE WHEN run_status = 'fail' THEN 1 END) as failed
      FROM pd_data_raw
      ${whereClause}
      GROUP BY stage
      ORDER BY count DESC
    `, params);

    // For projectStats, prefix all columns in whereClause with 'pd.'
    let projectWhereClause = whereClause.replace(/\b(project_id|block_name|experiment|stage|run_status|user_id|domain_id|start_date|end_date|run_end_time)\b/g, 'pd.$1');
    const projectStats = await pool.query(`
      SELECT 
        p.project_name,
        COUNT(pd.id) as total_runs,
        COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) as passed_runs,
        AVG(pd.area_um2) as avg_area,
        AVG(pd.utilization) as avg_utilization
      FROM pd_data_raw pd
      JOIN projects p ON pd.project_id = p.id
      ${projectWhereClause}
      GROUP BY p.id, p.project_name
      ORDER BY total_runs DESC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      overall_stats: stats[0][0],
      stage_stats: stageStats[0],
      project_stats: projectStats[0]
    });

  } catch (error) {
    console.error('Error fetching PD stats:', error);
    res.status(500).json({
      error: 'Error fetching PD statistics',
      details: error.message
    });
  }
});

// Get unique values for filters
router.get('/filter-options', auth, async (req, res) => {
  try {
    const { domain_id } = req.query;
    const [domains] = await pool.query('SELECT id, full_name FROM domains WHERE is_active = 1 ORDER BY full_name');
    let projects = [];
    let blocks = [];
    let experiments = [];
    if (domain_id) {
      [projects] = await pool.query('SELECT id, project_name FROM projects WHERE domain_id = ? ORDER BY project_name', [domain_id]);
      [blocks] = await pool.query('SELECT DISTINCT block_name FROM pd_data_raw WHERE domain_id = ? AND block_name IS NOT NULL ORDER BY block_name', [domain_id]);
      [experiments] = await pool.query('SELECT DISTINCT experiment FROM pd_data_raw WHERE domain_id = ? AND experiment IS NOT NULL ORDER BY experiment', [domain_id]);
    } else {
      [projects] = await pool.query('SELECT id, project_name FROM projects ORDER BY project_name');
      [blocks] = await pool.query('SELECT DISTINCT block_name FROM pd_data_raw WHERE block_name IS NOT NULL ORDER BY block_name');
      [experiments] = await pool.query('SELECT DISTINCT experiment FROM pd_data_raw WHERE experiment IS NOT NULL ORDER BY experiment');
    }
    res.json({
      success: true,
      domains: domains,
      projects: projects,
      blocks: blocks.map(b => b.block_name),
      experiments: experiments.map(e => e.experiment)
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      error: 'Error fetching filter options',
      details: error.message
    });
  }
});



// Endpoint to get the last modified timestamp of any CSV file in data_csv
router.get('/last-csv-timestamp', auth, async (req, res) => {
  try {
    const csvDir = path.join(__dirname, '../data_csv');
    if (!fs.existsSync(csvDir)) {
      return res.json({ timestamp: null });
    }
    const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv') && !f.includes('_processed_'));
    let lastTimestamp = null;
    files.forEach(file => {
      const stats = fs.statSync(path.join(csvDir, file));
      if (!lastTimestamp || stats.mtime > lastTimestamp) {
        lastTimestamp = stats.mtime;
      }
    });
    res.json({ timestamp: lastTimestamp ? lastTimestamp.toISOString() : null });
  } catch (error) {
    console.error('Error getting last CSV timestamp:', error);
    res.status(500).json({ error: 'Error getting last CSV timestamp', details: error.message });
  }
});

module.exports = router; 