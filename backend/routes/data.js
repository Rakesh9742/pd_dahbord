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

// Get manager view data with specific columns
router.get('/manager-data', auth, async (req, res) => {
  try {
    const {
      project_id,
      block_name,
      user_name,
      stage,
      domain_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0,
      rtl_tag,
      block_health_index // Add block_health_index to destructure
    } = req.query;

    let query = `
      SELECT 
        pd.block_name,
        u.name as user_name,
        pd.RTL_tag,
        pd.stage as current_stage,
        CASE 
          WHEN pd.run_status = 'pass' THEN 'Healthy'
          WHEN pd.run_status = 'fail' THEN 'Critical'
          WHEN pd.run_status = 'continue_with_error' THEN 'Warning'
          ELSE 'Unknown'
        END as block_health_index,
        pd.ai_summary as brief_summary,
        CASE 
          WHEN pd.run_status = 'fail' THEN 'High'
          WHEN pd.run_status = 'continue_with_error' THEN 'Medium'
          ELSE 'Low'
        END as open_tickets,
        pd.stage as milestone,
        CASE 
          WHEN pd.run_status = 'pass' THEN 'Compliant'
          WHEN pd.run_status = 'fail' THEN 'Non-Compliant'
          WHEN pd.run_status = 'continue_with_error' THEN 'Under Review'
          ELSE 'Pending'
        END as qms_status,
        pd.run_end_time,
        p.project_name,
        d.full_name as domain_name
      FROM pd_data_raw pd
      JOIN projects p ON pd.project_id = p.id
      JOIN users u ON pd.user_id = u.id
      JOIN domains d ON pd.domain_id = d.id
      INNER JOIN (
        SELECT block_name, MAX(run_end_time) as max_run_end_time
        FROM pd_data_raw
        GROUP BY block_name
      ) latest ON pd.block_name = latest.block_name AND pd.run_end_time = latest.max_run_end_time
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

    if (user_name) {
      query += ' AND u.name LIKE ?';
      params.push(`%${user_name}%`);
    }

    if (stage) {
      query += ' AND pd.stage = ?';
      params.push(stage);
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

    if (rtl_tag) {
      query += ' AND pd.RTL_tag LIKE ?';
      params.push(`%${rtl_tag}%`);
    }

    if (block_health_index) {
      if (block_health_index === 'Healthy') {
        query += " AND pd.run_status = 'pass'";
      } else if (block_health_index === 'Warning') {
        query += " AND pd.run_status = 'continue_with_error'";
      } else if (block_health_index === 'Critical') {
        query += " AND pd.run_status = 'fail'";
      } else if (block_health_index === 'Unknown') {
        query += " AND (pd.run_status IS NULL OR (pd.run_status NOT IN ('pass', 'fail', 'continue_with_error')))";
      }
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
    console.error('Error fetching manager data:', error);
    res.status(500).json({
      error: 'Error fetching manager data',
      details: error.message
    });
  }
});

// Get lead view data with specific columns
router.get('/lead-data', auth, async (req, res) => {
  try {
    const {
      project_id,
      block_name,
      user_name,
      stage,
      domain_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        pd.block_name,
        u.name as user_name,
        pd.RTL_tag,
        pd.experiment,
        pd.run_directory,
        pd.stage as current_stage,
        pd.interface_timing,
        pd.internal_timing,
        pd.max_tran_wns_nvp,
        pd.max_cap_wns_nvp,
        pd.noise,
        pd.congestion_drc_metrics,
        pd.area_um2 as area,
        pd.inst_count,
        pd.utilization,
        pd.logs_errors_warnings,
        pd.run_status,
        pd.runtime_seconds,
        pd.ai_summary as ai_overall_summary,
        pd.ir_static,
        NULL as ir_dynamic, -- Placeholder if not in schema
        pd.em_power_signal,
        pd.pv_drc,
        pd.lvs,
        pd.lec,
        NULL as open_closed_tickets, -- Placeholder if not in schema
        NULL as tickets_priority, -- Placeholder if not in schema
        CASE 
          WHEN pd.run_status = 'pass' THEN 'Compliant'
          WHEN pd.run_status = 'fail' THEN 'Non-Compliant'
          WHEN pd.run_status = 'continue_with_error' THEN 'Under Review'
          ELSE 'Pending'
        END as qms_status,
        pd.run_end_time,
        p.project_name,
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

    if (user_name) {
      query += ' AND u.name LIKE ?';
      params.push(`%${user_name}%`);
    }

    if (stage) {
      query += ' AND pd.stage = ?';
      params.push(stage);
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
    console.error('Error fetching lead data:', error);
    res.status(500).json({
      error: 'Error fetching lead data',
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

// Get dashboard statistics
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    
    if (startDate && endDate) {
      dateFilter = `WHERE run_end_time >= '${startDate}' AND run_end_time <= '${endDate} 23:59:59'`;
    }

    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(DISTINCT project_id) as total_projects,
        COUNT(CASE WHEN run_status = 'pass' THEN 1 END) as completed_runs,
        COUNT(CASE WHEN run_status = 'fail' THEN 1 END) as failed_runs,
        COUNT(CASE WHEN run_status = 'continue_with_error' THEN 1 END) as error_runs,
        COUNT(CASE WHEN run_status IN ('running', 'pending') THEN 1 END) as active_runs,
        COUNT(DISTINCT user_id) as total_users
      FROM pd_data_raw
      ${dateFilter}
    `);

    const [recentActivityResult] = await pool.query(`
      SELECT 
        pd.project_id,
        p.project_name,
        pd.run_status,
        pd.run_end_time,
        u.name as user_name
      FROM pd_data_raw pd
      JOIN projects p ON pd.project_id = p.id
      JOIN users u ON pd.user_id = u.id
      ORDER BY pd.run_end_time DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      totalProjects: statsResult[0]?.total_projects || 0,
      completedRuns: statsResult[0]?.completed_runs || 0,
      failedRuns: statsResult[0]?.failed_runs || 0,
      errorRuns: statsResult[0]?.error_runs || 0,
      activeRuns: statsResult[0]?.active_runs || 0,
      totalUsers: statsResult[0]?.total_users || 0,
      recentActivity: recentActivityResult
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Error fetching dashboard stats',
      details: error.message
    });
  }
});

// Get recent projects
router.get('/recent-projects', auth, async (req, res) => {
  try {
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.project_name,
        COUNT(pd.id) as total_runs,
        COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN pd.run_status = 'fail' THEN 1 END) as failed_runs,
        MAX(pd.run_end_time) as last_updated,
        CASE 
          WHEN COUNT(CASE WHEN pd.run_status = 'fail' THEN 1 END) > COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) THEN 'warning'
          WHEN COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) > 0 THEN 'success'
          ELSE 'pending'
        END as status
      FROM projects p
      LEFT JOIN pd_data_raw pd ON p.id = pd.project_id
      GROUP BY p.id, p.project_name
      ORDER BY last_updated DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      projects: projects
    });

  } catch (error) {
    console.error('Error fetching recent projects:', error);
    res.status(500).json({
      error: 'Error fetching recent projects',
      details: error.message
    });
  }
});

// Get project details
router.get('/project-details', auth, async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        error: 'Project ID is required'
      });
    }

    const [projectDetails] = await pool.query(`
      SELECT 
        p.project_name,
        COUNT(pd.id) as total_runs,
        COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN pd.run_status = 'fail' THEN 1 END) as failed_runs,
        COUNT(CASE WHEN pd.run_status = 'continue_with_error' THEN 1 END) as error_runs,
        AVG(pd.runtime_seconds) as avg_runtime,
        AVG(pd.area_um2) as avg_area,
        AVG(pd.utilization) as avg_utilization,
        MAX(pd.run_end_time) as last_run,
        MIN(pd.run_end_time) as first_run
      FROM projects p
      LEFT JOIN pd_data_raw pd ON p.id = pd.project_id
      WHERE p.id = ?
      GROUP BY p.id, p.project_name
    `, [project_id]);

    const [recentRuns] = await pool.query(`
      SELECT 
        pd.*,
        u.name as user_name
      FROM pd_data_raw pd
      JOIN users u ON pd.user_id = u.id
      WHERE pd.project_id = ?
      ORDER BY pd.run_end_time DESC
      LIMIT 10
    `, [project_id]);

    const [runStatusBreakdown] = await pool.query(`
      SELECT 
        run_status,
        COUNT(*) as count
      FROM pd_data_raw
      WHERE project_id = ?
      GROUP BY run_status
    `, [project_id]);

    res.json({
      success: true,
      projectDetails: projectDetails[0] || {},
      recentRuns: recentRuns,
      statusBreakdown: runStatusBreakdown
    });

  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({
      error: 'Error fetching project details',
      details: error.message
    });
  }
});

// Get recent activity
router.get('/recent-activity', auth, async (req, res) => {
  try {
    // Get recent runs activity
    const [recentRuns] = await pool.query(`
      SELECT 
        'run_completed' as type,
        pd.block_name,
        pd.experiment,
        pd.run_status,
        pd.run_end_time as timestamp,
        u.name as user_name,
        p.project_name,
        CASE 
          WHEN pd.run_status = 'pass' THEN 'Run completed successfully'
          WHEN pd.run_status = 'fail' THEN 'Run failed'
          ELSE 'Run completed with errors'
        END as description
      FROM pd_data_raw pd
      JOIN users u ON pd.user_id = u.id
      JOIN projects p ON pd.project_id = p.id
      ORDER BY pd.run_end_time DESC
      LIMIT 10
    `);

    // Get file upload activity (if you have a file_uploads table)
    const [fileUploads] = await pool.query(`
      SELECT 
        'file_upload' as type,
        fu.file_name,
        fu.upload_time as timestamp,
        u.name as user_name,
        CONCAT('React file "', fu.file_name, '" uploaded to database') as description
      FROM file_uploads fu
      JOIN users u ON fu.user_id = u.id
      ORDER BY fu.upload_time DESC
      LIMIT 5
    `).catch(() => []); // If table doesn't exist, return empty array

    // Get project creation activity
    const [projectCreations] = await pool.query(`
      SELECT 
        'project_created' as type,
        p.project_name,
        p.created_at as timestamp,
        u.name as user_name,
        CONCAT('New project "', p.project_name, '" created') as description
      FROM projects p
      JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `).catch(() => []); // If created_by column doesn't exist, return empty array

    // Get user login activity (if you have a login_logs table)
    const [userLogins] = await pool.query(`
      SELECT 
        'user_login' as type,
        ll.login_time as timestamp,
        u.name as user_name,
        CONCAT('User ', u.name, ' logged in') as description
      FROM login_logs ll
      JOIN users u ON ll.user_id = u.id
      ORDER BY ll.login_time DESC
      LIMIT 5
    `).catch(() => []); // If table doesn't exist, return empty array

    // Combine all activities and sort by timestamp
    const allActivities = [
      ...recentRuns.map(run => ({
        type: run.run_status === 'fail' ? 'run_failed' : 'run_completed',
        block_name: run.block_name,
        experiment: run.experiment,
        project_name: run.project_name,
        user_name: run.user_name,
        timestamp: run.timestamp,
        description: run.description
      })),
      ...fileUploads,
      ...projectCreations,
      ...userLogins
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

    res.json({
      success: true,
      activities: allActivities
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      error: 'Error fetching recent activity',
      details: error.message
    });
  }
});

// Get chart data for dashboard
router.get('/chart-data', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Generate date series based on filter or default to last 7 days
    let dateSeriesQuery = '';
    let dateFilter = '';
    
    if (startDate && endDate) {
      // Generate date series for the selected range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      let dateUnion = '';
      for (let i = 0; i <= days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        if (i > 0) dateUnion += ' UNION ALL ';
        dateUnion += `SELECT '${dateStr}' as date`;
      }
      
      dateSeriesQuery = `(${dateUnion})`;
      dateFilter = `AND DATE(pd.run_end_time) >= '${startDate}' AND DATE(pd.run_end_time) <= '${endDate}'`;
    } else {
      // Default to last 7 days
      dateSeriesQuery = `(
        SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) as date
        UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)
        UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)
        UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)
        UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        UNION ALL SELECT CURDATE()
      )`;
    }

    // Get run trends for selected date range
    const [runTrends] = await pool.query(`
      SELECT 
        date_series.date as date,
        COALESCE(COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END), 0) as completed,
        COALESCE(COUNT(CASE WHEN pd.run_status = 'fail' THEN 1 END), 0) as failed
      FROM ${dateSeriesQuery} date_series
      LEFT JOIN pd_data_raw pd ON DATE(pd.run_end_time) = date_series.date ${dateFilter}
      GROUP BY date_series.date
      ORDER BY date_series.date ASC
    `);

    // Get status distribution
    let statusDistributionQuery = `
      SELECT 
        run_status as name,
        COUNT(*) as value
      FROM pd_data_raw
    `;
    
    if (startDate && endDate) {
      statusDistributionQuery += ` WHERE run_end_time >= '${startDate}' AND run_end_time <= '${endDate} 23:59:59'`;
    }
    
    statusDistributionQuery += `
      GROUP BY run_status
      ORDER BY value DESC
    `;
    
    const [statusDistribution] = await pool.query(statusDistributionQuery);

    // Get project performance (top 10 projects by run count)
    let projectPerformanceQuery = `
      SELECT 
        p.project_name as project,
        COUNT(pd.id) as runs,
        COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) as successful,
        COUNT(CASE WHEN pd.run_status = 'fail' THEN 1 END) as failed
      FROM projects p
      LEFT JOIN pd_data_raw pd ON p.id = pd.project_id
    `;
    
    if (startDate && endDate) {
      projectPerformanceQuery += ` WHERE (pd.run_end_time >= '${startDate}' AND pd.run_end_time <= '${endDate} 23:59:59') OR pd.run_end_time IS NULL`;
    }
    
    projectPerformanceQuery += `
      GROUP BY p.id, p.project_name
      HAVING runs > 0
      ORDER BY runs DESC
      LIMIT 10
    `;
    
    const [projectPerformance] = await pool.query(projectPerformanceQuery);

    // Get weekly statistics for last 8 weeks
    const [weeklyStats] = await pool.query(`
      SELECT 
        CONCAT('Week ', week_number) as week,
        COUNT(pd.id) as totalRuns,
        ROUND(
          (COUNT(CASE WHEN pd.run_status = 'pass' THEN 1 END) * 100.0 / COUNT(pd.id)), 
          1
        ) as successRate
      FROM (
        SELECT 
          id,
          run_status,
          WEEK(run_end_time) as week_number,
          YEAR(run_end_time) as year_number
        FROM pd_data_raw 
        WHERE run_end_time >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      ) pd
      GROUP BY week_number, year_number
      ORDER BY year_number ASC, week_number ASC
    `);

    // Format the data for charts
    const formattedRunTrends = runTrends.map(row => ({
      date: row.date,
      dateFormatted: new Date(row.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      completed: parseInt(row.completed) || 0,
      failed: parseInt(row.failed) || 0
    }));

    const formattedStatusDistribution = statusDistribution.map(row => ({
      name: row.name,
      value: parseInt(row.value) || 0
    }));

    const formattedProjectPerformance = projectPerformance.map(row => ({
      project: row.project,
      runs: parseInt(row.runs) || 0,
      successful: parseInt(row.successful) || 0,
      failed: parseInt(row.failed) || 0
    }));

    const formattedWeeklyStats = weeklyStats.map(row => ({
      week: row.week,
      totalRuns: parseInt(row.totalRuns) || 0,
      successRate: parseFloat(row.successRate) || 0
    }));

    res.json({
      success: true,
      runTrends: formattedRunTrends,
      statusDistribution: formattedStatusDistribution,
      projectPerformance: formattedProjectPerformance,
      weeklyStats: formattedWeeklyStats
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      error: 'Error fetching chart data',
      details: error.message
    });
  }
});

module.exports = router; 