const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'eda_dashboard'
};

async function checkUserName() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔗 Connected to database');

    // Check if user_name column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pd_data_raw' AND COLUMN_NAME = 'user_name'
    `, [dbConfig.database]);

    if (columns.length > 0) {
      console.log('✅ user_name column exists:');
      columns.forEach(col => {
        console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE} - Default: ${col.COLUMN_DEFAULT}`);
      });
    } else {
      console.log('❌ user_name column does not exist');
      
      // Add the column
      console.log('🔄 Adding user_name column...');
      await connection.execute(`
        ALTER TABLE pd_data_raw 
        ADD COLUMN user_name VARCHAR(100) NOT NULL DEFAULT ''
      `);
      console.log('✅ Added user_name column');
    }

    // Show all columns again
    const [allColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pd_data_raw'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);

    console.log('\n📋 All pd_data_raw table columns:');
    allColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE} - Default: ${col.COLUMN_DEFAULT}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserName(); 