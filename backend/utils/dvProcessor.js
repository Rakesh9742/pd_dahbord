class DVProcessor {
  async process(rows, db, userId) {
    for (const row of rows) {
      try {
        // Find or create project
        const [existingProject] = await db.query(
          'SELECT id FROM projects WHERE project_name = ? AND domain_id = 3',
          [row.project, 3]
        );
        let projectId;
        if (existingProject.length > 0) {
          projectId = existingProject[0].id;
        } else {
          const [result] = await db.query(
            'INSERT INTO projects (project_name, domain_id, created_by, description) VALUES (?, 3, ?, ?)',
            [row.project, userId, `Project ${row.project} for Design Verification`]
          );
          projectId = result.insertId;
        }

        // Check for duplicate (project_id + module, not deleted)
        const [dupes] = await db.query(
          'SELECT id FROM dv_data_raw WHERE project_id = ? AND module = ? AND is_deleted = FALSE',
          [projectId, row.module]
        );
        if (dupes.length > 0) {
          console.warn(`[DVProcessor] Duplicate found for project: ${row.project}, module: ${row.module}. Skipping.`);
          continue;
        }

        // Prepare insert data (all raw values, no conversion)
        const insertData = {
          project_id: projectId,
          domain_id: 3,
          module: row.module || null,
          tb_dev_total: row.tb_dev_total || null,
          tb_dev_coded: row.tb_dev_coded || null,
          test_total: row.test_total || null,
          test_coded: row.test_coded || null,
          test_pass: row.test_pass || null,
          test_fail: row.test_fail || null,
          assert_total: row.assert_total || null,
          assert_coded: row.assert_coded || null,
          assert_pass: row.assert_pass || null,
          assert_fail: row.assert_fail || null,
          code_coverage_percent: row.code_coverage_ || null,
          functional_coverage_percent: row.functional_coverage_ || null,
          req_total: row.req_total || null,
          req_covered: row.req_covered || null,
          req_uncovered: row.req_uncovered || null,
          block_status: row.block_status || null,
          collected_by: userId
        };

        // Insert into dv_data_raw
        const query = `
          INSERT INTO dv_data_raw (
            project_id, domain_id, module, tb_dev_total, tb_dev_coded, test_total, test_coded, test_pass, test_fail,
            assert_total, assert_coded, assert_pass, assert_fail, code_coverage_percent, functional_coverage_percent,
            req_total, req_covered, req_uncovered, block_status, collected_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          insertData.project_id,
          insertData.domain_id,
          insertData.module,
          insertData.tb_dev_total,
          insertData.tb_dev_coded,
          insertData.test_total,
          insertData.test_coded,
          insertData.test_pass,
          insertData.test_fail,
          insertData.assert_total,
          insertData.assert_coded,
          insertData.assert_pass,
          insertData.assert_fail,
          insertData.code_coverage_percent,
          insertData.functional_coverage_percent,
          insertData.req_total,
          insertData.req_covered,
          insertData.req_uncovered,
          insertData.block_status,
          insertData.collected_by
        ];
        await db.query(query, values);
        console.log(`[DVProcessor] Inserted DV row for project: ${row.project}, module: ${row.module}`);
      } catch (err) {
        console.error(`[DVProcessor] Error inserting DV row for project: ${row.project}, module: ${row.module}:`, err);
      }
    }
  }
}

module.exports = DVProcessor; 