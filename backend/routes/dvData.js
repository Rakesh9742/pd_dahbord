const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    // Extract possible filters from query params
    const { project_id, module, tb_dev_total, tb_dev_coded, test_total, test_coded, test_pass, test_fail, assert_total, assert_coded, assert_pass, assert_fail, code_coverage_percent, functional_coverage_percent, req_total, req_covered, req_uncovered, block_status, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM dv_data_raw WHERE 1=1';
    const params = [];

    if (project_id) {
      query += ' AND project_id = ?';
      params.push(project_id);
    }
    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }
    if (tb_dev_total) {
      query += ' AND tb_dev_total = ?';
      params.push(tb_dev_total);
    }
    if (tb_dev_coded) {
      query += ' AND tb_dev_coded = ?';
      params.push(tb_dev_coded);
    }
    if (test_total) {
      query += ' AND test_total = ?';
      params.push(test_total);
    }
    if (test_coded) {
      query += ' AND test_coded = ?';
      params.push(test_coded);
    }
    if (test_pass) {
      query += ' AND test_pass = ?';
      params.push(test_pass);
    }
    if (test_fail) {
      query += ' AND test_fail = ?';
      params.push(test_fail);
    }
    if (assert_total) {
      query += ' AND assert_total = ?';
      params.push(assert_total);
    }
    if (assert_coded) {
      query += ' AND assert_coded = ?';
      params.push(assert_coded);
    }
    if (assert_pass) {
      query += ' AND assert_pass = ?';
      params.push(assert_pass);
    }
    if (assert_fail) {
      query += ' AND assert_fail = ?';
      params.push(assert_fail);
    }
    if (code_coverage_percent) {
      query += ' AND code_coverage_percent = ?';
      params.push(code_coverage_percent);
    }
    if (functional_coverage_percent) {
      query += ' AND functional_coverage_percent = ?';
      params.push(functional_coverage_percent);
    }
    if (req_total) {
      query += ' AND req_total = ?';
      params.push(req_total);
    }
    if (req_covered) {
      query += ' AND req_covered = ?';
      params.push(req_covered);
    }
    if (req_uncovered) {
      query += ' AND req_uncovered = ?';
      params.push(req_uncovered);
    }
    if (block_status) {
      query += ' AND block_status = ?';
      params.push(block_status);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DV data' });
  }
});

module.exports = router; 