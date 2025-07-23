const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'eda_dashboard'
};

async function checkSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔗 Connected to database');

    // Check pd_data_raw table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pd_data_raw'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);

    console.log('📋 pd_data_raw table columns:');
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE} - Default: ${col.COLUMN_DEFAULT}`);
    });

    // Check foreign key constraints
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pd_data_raw' AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);

    console.log('\n🔗 Foreign key constraints:');
    constraints.forEach(constraint => {
      console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema(); 