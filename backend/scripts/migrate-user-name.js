const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'eda_dashboard'
};

async function migrateToUserName() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔗 Connected to database');

    // Check if user_name column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pd_data_raw' AND COLUMN_NAME = 'user_name'
    `, [dbConfig.database]);

    if (columns.length > 0) {
      console.log('✅ user_name column already exists');
      return;
    }

    console.log('🔄 Starting migration to user_name...');

    // Add user_name column
    await connection.execute(`
      ALTER TABLE pd_data_raw 
      ADD COLUMN user_name VARCHAR(100) NOT NULL DEFAULT ''
    `);
    console.log('✅ Added user_name column');

    // Update user_name with actual user names
    await connection.execute(`
      UPDATE pd_data_raw pd 
      JOIN users u ON pd.user_id = u.id 
      SET pd.user_name = u.name
    `);
    console.log('✅ Updated user_name with actual user names');

    // Drop the foreign key constraint first
    await connection.execute(`
      ALTER TABLE pd_data_raw 
      DROP FOREIGN KEY pd_data_raw_ibfk_3
    `);
    console.log('✅ Dropped foreign key constraint');

    // Remove user_id column
    await connection.execute(`
      ALTER TABLE pd_data_raw 
      DROP COLUMN user_id
    `);
    console.log('✅ Removed user_id column');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateToUserName(); 