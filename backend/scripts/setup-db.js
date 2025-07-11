const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function setupDatabase() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      ...dbConfig,
      database: undefined
    });

    console.log('🔗 Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'eda_dashboard'}`);
    console.log('✅ Database created/verified');

    // Use the database
    await connection.execute(`USE ${process.env.DB_NAME || 'eda_dashboard'}`);

    // Create tables
    const createTables = `
      -- 1. User Roles
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Users
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES user_roles(id)
      );

      -- 3. Domains 
      CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_code VARCHAR(10) NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Projects
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_name VARCHAR(100) NOT NULL,
        domain_id INT NOT NULL,
        description TEXT,
        status ENUM('active', 'completed', 'on_hold', 'cancelled') DEFAULT 'active',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (domain_id) REFERENCES domains(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      -- 5. Project-User Mapping
      CREATE TABLE IF NOT EXISTS project_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role_in_project VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE (project_id, user_id)
      );

      -- 6. PD Raw Data
      CREATE TABLE IF NOT EXISTS pd_data_raw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        domain_id INT NOT NULL,
        block_name VARCHAR(100),
        experiment VARCHAR(100),
        RTL_tag VARCHAR(100),
        user_id INT NOT NULL,
        run_directory TEXT,
        run_end_time DATETIME,
        stage VARCHAR(100),
        internal_timing VARCHAR(100),
        interface_timing VARCHAR(100),
        max_tran_wns_nvp VARCHAR(100),
        max_cap_wns_nvp VARCHAR(100),
        noise VARCHAR(100),
        mpw_min_period_double_switching VARCHAR(100),
        congestion_drc_metrics VARCHAR(100),
        area_um2 DECIMAL(15,2),
        inst_count INT,
        utilization DECIMAL(5,2),
        logs_errors_warnings TEXT,
        run_status ENUM('pass', 'fail', 'continue_with_error', 'running', 'aborted') DEFAULT 'running',
        runtime_seconds INT,
        ai_summary TEXT,
        ir_static VARCHAR(100),
        em_power_signal VARCHAR(100),
        pv_drc TEXT,
        lvs VARCHAR(100),
        lec VARCHAR(100),
        collected_by INT,
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (domain_id) REFERENCES domains(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (collected_by) REFERENCES users(id)
      );
    `;

    // Execute table creation
    const statements = createTables.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    console.log('✅ Tables created successfully');

    // Insert default roles
    const insertRoles = `
      INSERT IGNORE INTO user_roles (role_name, description) VALUES 
      ('Admin', 'System administrator with full access to all projects and data'),
      ('Engineer', 'Technical engineer with access to assigned projects and data collection'),
      ('Lead', 'Project lead with oversight responsibilities for assigned projects'),
      ('Program Manager', 'Program manager with project management and reporting access'),
      ('Customer', 'Customer with limited read-only access to relevant project data');
    `;
    await connection.execute(insertRoles);
    console.log('✅ Default roles inserted');

    // Insert default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const insertAdminUser = `
      INSERT IGNORE INTO users (name, email, password, role_id) VALUES 
      ('Admin User', 'admin@company.com', ?, 1);
    `;
    await connection.execute(insertAdminUser, [hashedPassword]);
    console.log('✅ Default admin user inserted');

    // Insert EDA domains
    const insertDomains = `
      INSERT IGNORE INTO domains (short_code, full_name, description) VALUES
      ('PD', 'Physical Design', 'Physical design and layout optimization'),
      ('RTL', 'Register Transfer Level', 'RTL design and synthesis'),
      ('DV', 'Design Verification', 'Design verification and validation'),
      ('CD', 'Clock Design', 'Clock tree synthesis and optimization'),
      ('CL', 'Custom Layout', 'Custom layout design'),
      ('DFT', 'Design for Testability', 'Design for test and scan insertion');
    `;
    await connection.execute(insertDomains);
    console.log('✅ EDA domains inserted');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 API Endpoints for Postman testing:');
    console.log('   POST /api/auth/register - Create new user');
    console.log('   POST /api/auth/login - User login');
    console.log('   GET /api/auth/me - Get current user');
    console.log('\n🚀 You can now start the backend server with: npm run dev');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase(); 