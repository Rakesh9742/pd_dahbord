const CSVProcessor = require('./utils/csvProcessor');
const { pool } = require('./config/database');
const path = require('path');

async function processCSVManually() {
  try {
    console.log('🚀 Starting manual CSV processing...');
    
    // Initialize CSV processor
    const csvProcessor = new CSVProcessor(pool);
    
    // Process the existing CSV file
    const filePath = path.join(__dirname, '../PD_dashboard_proj1_blk1 (1).csv');
    
    console.log(`📁 Processing file: ${filePath}`);
    
    // Process with domain ID 1 (PD) and user ID 1 (Admin)
    const result = await csvProcessor.processCSVFile(filePath, 1, 1);
    
    console.log('✅ Processing completed!');
    console.log('Result:', result);
    
    // Check if data was inserted by querying the database
    const [data] = await pool.query('SELECT COUNT(*) as count FROM pd_data_raw');
    console.log(`📊 Total records in database: ${data[0].count}`);
    
    if (data[0].count > 0) {
      const [sampleData] = await pool.query(`
        SELECT project_id, block_name, experiment, stage, run_status, area_um2, inst_count 
        FROM pd_data_raw 
        ORDER BY id DESC 
        LIMIT 3
      `);
      console.log('📋 Sample data from database:', sampleData);
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
  } finally {
    // Close database connection
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

processCSVManually(); 