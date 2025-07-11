const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const logger = require('./logger');

class CSVProcessor {
  constructor(db) {
    this.db = db;
  }

  // Convert time format "hr:min" to seconds
  convertTimeToSeconds(timeStr) {
    if (!timeStr || timeStr === 'NA') return null;
    
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      return (hours * 3600) + (minutes * 60);
    }
    return null;
  }

  // Convert area string to decimal
  convertAreaToDecimal(areaStr) {
    if (!areaStr || areaStr === 'NA') return null;
    return parseFloat(areaStr);
  }

  // Convert instance count to integer
  convertInstCountToInt(instStr) {
    if (!instStr || instStr === 'NA') return null;
    return parseInt(instStr);
  }

  // Convert utilization percentage to decimal
  convertUtilizationToDecimal(utilStr) {
    if (!utilStr || utilStr === 'NA') return null;
    // Remove % sign if present
    const cleanStr = utilStr.replace('%', '');
    return parseFloat(cleanStr);
  }

  // Parse date in DD/MM/YYYY or fallback to original
  parseDate(dateStr) {
    if (!dateStr || dateStr === 'NA') return null;
    // Try DD/MM/YYYY
    const ddmmyyyy = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/;
    const match = dateStr.match(ddmmyyyy);
    if (match) {
      const [_, dd, mm, yyyy] = match;
      return new Date(`${yyyy}-${mm}-${dd}`);
    }
    // Try default Date parsing
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Find or create project
  async findOrCreateProject(projectName, domainId, userId) {
    try {
      // First try to find existing project
      const [existingProject] = await this.db.query(
        'SELECT id FROM projects WHERE project_name = ? AND domain_id = ?',
        [projectName, domainId]
      );

      if (existingProject.length > 0) {
        return existingProject[0].id;
      }

      // Create new project if not exists
      const [result] = await this.db.query(
        'INSERT INTO projects (project_name, domain_id, created_by, description) VALUES (?, ?, ?, ?)',
        [projectName, domainId, userId, `Project ${projectName} for Physical Design`]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error finding/creating project:', error);
      throw error;
    }
  }

  // Find user by name
  async findUserByName(userName) {
    try {
      const [users] = await this.db.query(
        'SELECT id FROM users WHERE name = ?',
        [userName]
      );

      if (users.length > 0) {
        return users[0].id;
      }

      // If user doesn't exist, create a default user
      const [result] = await this.db.query(
        'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
        [userName, `${userName.toLowerCase()}@company.com`, 'default_password', 2] // role_id 2 = Engineer
      );

      return result.insertId;
    } catch (error) {
      console.error('Error finding/creating user:', error);
      throw error;
    }
  }

  // Normalize CSV headers to match expected database fields
  normalizeHeaders(row) {
    const mapping = {
      'project': 'project',
      'block_name': 'block_name',
      'experiment': 'experiment',
      'RTL _tag': 'RTL_tag',
      'user_name': 'user_name',
      'run_directory': 'run_directory',
      'run end time': 'run_end_time',
      'stage': 'stage',
      'internal timing': 'internal_timing',
      'Interface timing': 'interface_timing',
      'Max tran (WNS/NVP)': 'max_tran_wns_nvp',
      'Max cap (WNS/NVP)': 'max_cap_wns_nvp',
      'Noise': 'noise',
      'MPW/min period/Double switching': 'mpw_min_period_double_switching',
      'Congestion/DRC metrics': 'congestion_drc_metrics',
      'Area(um2)': 'area_um2',
      'Inst count': 'inst_count',
      'Utilization': 'utilization',
      'Logs Errors & Warnings': 'logs_errors_warnings',
      'AI based overall summary and suggestions': 'ai_summary',
      'IR  (Static)': 'ir_static',
      'EM (power, signal)': 'em_power_signal',
      'PV (DRC (Base drc, metal drc, antenna)': 'pv_drc',
      'LVS': 'lvs',
      'LEC': 'lec',
    };
    const normalized = {};
    for (const key in row) {
      const cleanKey = key.replace(/\s+/g, ' ').replace(/"/g, '').trim();
      // Robust mapping for run_status
      if (/^run status\s*\(pass\/fail\/continue_with_error\)$/i.test(cleanKey)) {
        normalized['run_status'] = row[key];
      } else if (mapping[cleanKey] !== undefined) {
        normalized[mapping[cleanKey]] = row[key];
      } else {
        normalized[cleanKey] = row[key];
      }
    }
    return normalized;
  }

  // Process CSV file and insert data
  async processCSVFile(filePath, domainId, collectedByUserId) {
    const fs = require('fs');
    return new Promise((resolve, reject) => {
      const results = [];
      let rowCount = 0;
      let validRowCount = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rowCount++;
          
          // Normalize headers
          const normalized = this.normalizeHeaders(data);
          
          // Check if this is a valid data row
          // Skip empty rows and header rows
          const hasProject = normalized.project && normalized.project.trim() !== '';
          const hasBlockName = normalized.block_name && normalized.block_name.trim() !== '';
          const isNotHeader = normalized.project !== 'project';
          const hasValidData = hasProject && hasBlockName && isNotHeader;
          
          if (hasValidData) {
            validRowCount++;
            console.log(`✅ Valid row ${validRowCount}: ${normalized.project} - ${normalized.block_name} - ${normalized.experiment}`);
            results.push(normalized);
          } else {
            console.log(`⏭️ Skipping row ${rowCount}: project="${normalized.project}", block="${normalized.block_name}"`);
            logger.warning(`Skipping invalid row ${rowCount}: project="${normalized.project}", block="${normalized.block_name}"`, path.basename(filePath));
          }
        })
        .on('end', async () => {
          console.log(`📈 CSV Processing Summary:`);
          console.log(`   Total rows read: ${rowCount}`);
          console.log(`   Valid data rows: ${validRowCount}`);
          console.log(`   Records to insert: ${results.length}`);
          
          // Only log if there are no valid records (error case)
          if (validRowCount === 0) {
            logger.error(`CSV Processing: No valid records found in ${path.basename(filePath)}`, path.basename(filePath));
          }
          
          try {
            let fileMoved = false;
            if (results.length > 0) {
              console.log('🗄️ Starting database insertion...');
              const { errorCount, duplicateCount } = await this.insertCSVData(results, domainId, collectedByUserId, filePath);
              console.log('✅ Database insertion completed successfully');
              // Move file if errors or duplicates occurred
              if (errorCount > 0 || duplicateCount > 0) {
                const logDir = path.join(__dirname, '../log_files');
                if (!fs.existsSync(logDir)) {
                  fs.mkdirSync(logDir, { recursive: true });
                }
                const destPath = path.join(logDir, path.basename(filePath));
                fs.renameSync(filePath, destPath);
                fileMoved = true;
                console.warn(`⚠️ File ${filePath} had errors or duplicates and was moved to ${destPath}`);
              }
              logger.info(`Successfully processed ${results.length} records from CSV`, path.basename(filePath));
              resolve({
                success: true,
                message: `Successfully processed ${results.length} records from CSV`,
                recordsProcessed: results.length,
                totalRows: rowCount,
                validRows: validRowCount,
                errors: errorCount,
                duplicates: duplicateCount
              });
            } else {
              console.log('❌ No valid records found in CSV file');
              logger.error('No valid records found in CSV file', path.basename(filePath));
              // Move file if no valid records
              const logDir = path.join(__dirname, '../log_files');
              if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
              }
              const destPath = path.join(logDir, path.basename(filePath));
              fs.renameSync(filePath, destPath);
              fileMoved = true;
              console.warn(`⚠️ File ${filePath} had no valid records and was moved to ${destPath}`);
              resolve({
                success: false,
                message: `No valid records found in CSV file`,
                recordsProcessed: 0,
                totalRows: rowCount,
                validRows: 0,
                errors: 0,
                duplicates: 0
              });
            }
          } catch (error) {
            console.error('❌ Error in CSV processing:', error);
            logger.error(`Error in CSV processing: ${error.message}`, path.basename(filePath));
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          logger.error(`CSV parsing error: ${error.message}`, path.basename(filePath));
          reject(error);
        });
    });
  }

  // Insert CSV data into database
  async insertCSVData(csvData, domainId, collectedByUserId, filePath) {
    console.log(`🗄️ Starting database insertion for ${csvData.length} records...`);
    logger.info(`Starting database insertion for ${csvData.length} records`, filePath ? path.basename(filePath) : 'unknown.csv');
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    for (const row of csvData) {
      try {
        console.log(`📝 Processing: ${row.project} - ${row.block_name} - ${row.experiment}`);
        logger.info(`Processing record: ${row.project} - ${row.block_name} - ${row.experiment}`, filePath ? path.basename(filePath) : 'unknown.csv');
        
        // Find or create project
        const projectId = await this.findOrCreateProject(row.project, domainId, collectedByUserId);
        console.log(`📋 Project ID: ${projectId}`);
        
        // Find or create user
        const userId = await this.findUserByName(row.user_name);
        console.log(`👤 User ID: ${userId}`);
        
        // Prepare data for insertion
        const insertData = {
          project_id: projectId,
          domain_id: domainId,
          block_name: row.block_name || null,
          experiment: row.experiment || null,
          RTL_tag: row.RTL_tag || null,
          user_id: userId,
          run_directory: row.run_directory || null,
          run_end_time: this.parseDate(row.run_end_time),
          stage: row.stage || null,
          internal_timing: row.internal_timing || null,
          interface_timing: row.interface_timing || null,
          max_tran_wns_nvp: row.max_tran_wns_nvp || null,
          max_cap_wns_nvp: row.max_cap_wns_nvp || null,
          noise: row.noise || null,
          mpw_min_period_double_switching: row.mpw_min_period_double_switching || null,
          congestion_drc_metrics: row.congestion_drc_metrics || null,
          area_um2: this.convertAreaToDecimal(row.area_um2),
          inst_count: this.convertInstCountToInt(row.inst_count),
          utilization: this.convertUtilizationToDecimal(row.utilization),
          logs_errors_warnings: row.logs_errors_warnings || null,
          run_status: row.run_status || null,
          runtime_seconds: this.convertTimeToSeconds(row.runtime_seconds),
          ai_summary: row.ai_summary || null,
          ir_static: row.ir_static || null,
          em_power_signal: row.em_power_signal || null,
          pv_drc: row.pv_drc || null,
          lvs: row.lvs || null,
          lec: row.lec || null,
          collected_by: collectedByUserId
        };
        
        // Duplicate check: look for existing row with same key fields
        const [existingRows] = await this.db.query(
          `SELECT id FROM pd_data_raw WHERE project_id = ? AND block_name = ? AND experiment = ? AND run_end_time = ?`,
          [insertData.project_id, insertData.block_name, insertData.experiment, insertData.run_end_time]
        );
        if (existingRows.length > 0) {
          console.error('❌ Duplicate entry detected, skipping insert:', {
            project: row.project,
            block: row.block_name,
            experiment: row.experiment,
            run_end_time: row.run_end_time
          });
          logger.warning(`Duplicate entry detected, skipping insert: ${row.project} - ${row.block_name} - ${row.experiment}`, filePath ? path.basename(filePath) : 'unknown.csv');
          this.logDuplicateError(row, `${row.project}_${row.block_name}_${row.experiment}`);
          duplicateCount++;
          continue;
        }
        
        // Insert into pd_data_raw table
        const query = `
          INSERT INTO pd_data_raw (
            project_id, domain_id, block_name, experiment, RTL_tag, user_id,
            run_directory, run_end_time, stage, internal_timing, interface_timing,
            max_tran_wns_nvp, max_cap_wns_nvp, noise, mpw_min_period_double_switching,
            congestion_drc_metrics, area_um2, inst_count, utilization,
            logs_errors_warnings, run_status, runtime_seconds, ai_summary,
            ir_static, em_power_signal, pv_drc, lvs, lec, collected_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          insertData.project_id,
          insertData.domain_id,
          insertData.block_name,
          insertData.experiment,
          insertData.RTL_tag,
          insertData.user_id,
          insertData.run_directory,
          insertData.run_end_time,
          insertData.stage,
          insertData.internal_timing,
          insertData.interface_timing,
          insertData.max_tran_wns_nvp,
          insertData.max_cap_wns_nvp,
          insertData.noise,
          insertData.mpw_min_period_double_switching,
          insertData.congestion_drc_metrics,
          insertData.area_um2,
          insertData.inst_count,
          insertData.utilization,
          insertData.logs_errors_warnings,
          insertData.run_status,
          insertData.runtime_seconds,
          insertData.ai_summary,
          insertData.ir_static,
          insertData.em_power_signal,
          insertData.pv_drc,
          insertData.lvs,
          insertData.lec,
          insertData.collected_by
        ];
        
        console.log(`💾 Inserting with values:`, {
          project: row.project,
          block: row.block_name,
          experiment: row.experiment,
          stage: row.stage,
          status: row.run_status,
          area: insertData.area_um2,
          inst_count: insertData.inst_count,
          utilization: insertData.utilization
        });
        
        const result = await this.db.query(query, values);
        console.log(`✅ Insert successful, ID: ${result[0].insertId}`);
        logger.logSuccess('Database Insert', {
          project: row.project,
          block: row.block_name,
          experiment: row.experiment,
          insertId: result[0].insertId,
          user: row.user_name,
          stage: row.stage,
          status: row.run_status
        }, 'CSVProcessor');
        successCount++;
        
      } catch (error) {
        console.error('❌ Error inserting row:', error.message);
        console.error('❌ Problematic row data:', {
          project: row.project,
          block: row.block_name,
          experiment: row.experiment,
          user: row.user_name
        });
        logger.error(`Error inserting row: ${error.message} for ${row.project} - ${row.block_name} - ${row.experiment}`, filePath ? path.basename(filePath) : 'unknown.csv');
        errorCount++;
      }
    }
    
    console.log(`📊 Insertion Summary:`);
    console.log(`   Successful inserts: ${successCount}`);
    console.log(`   Duplicate rows skipped: ${duplicateCount}`);
    console.log(`   Failed inserts: ${errorCount}`);
    console.log(`   Total processed: ${successCount + errorCount + duplicateCount}`);
    
    // Only log if there are errors or duplicates
    if (errorCount > 0) {
      logger.error(`Database insertion errors: ${errorCount} records failed to insert`, filePath ? path.basename(filePath) : 'unknown.csv');
    }
    
    if (duplicateCount > 0) {
      logger.warning(`Database insertion: ${duplicateCount} duplicate records skipped`, filePath ? path.basename(filePath) : 'unknown.csv');
    }
    
    if (errorCount > 0) {
      console.warn(`⚠️ ${errorCount} records failed to insert. Check logs for details.`);
    }
    
    if (successCount === 0) {
      logger.error('No records were successfully inserted into the database', filePath ? path.basename(filePath) : 'unknown.csv');
      throw new Error('No records were successfully inserted into the database');
    }
    return { errorCount, duplicateCount };
  }

  // Get all CSV files in the data_csv directory
  async getCSVFiles() {
    const csvDir = path.join(__dirname, '../data_csv');
    if (!fs.existsSync(csvDir)) {
      return [];
    }
    const files = fs.readdirSync(csvDir);
    return files.filter(file => file.endsWith('.csv') && !file.includes('_processed_'));
  }

  // Process all CSV files in the directory
  async processAllCSVFiles(domainId, collectedByUserId) {
    const csvFiles = await this.getCSVFiles();
    const results = [];

    for (const file of csvFiles) {
      try {
        const filePath = path.join(__dirname, '../data_csv', file);
        const result = await this.processCSVFile(filePath, domainId, collectedByUserId);
        results.push({
          file,
          ...result
        });
      } catch (error) {
        results.push({
          file,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Log duplicate error to file
  logDuplicateError(row, fileName) {
    const logger = require('./logger');
    logger.logDuplicateError(row, fileName);
  }
}

module.exports = CSVProcessor;