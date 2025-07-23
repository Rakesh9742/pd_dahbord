-- Improved Database Schema for EDA Dashboard

-- 1. User Roles
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT,
    profile_picture VARCHAR(500) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

-- 3. Domains 
CREATE TABLE domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    short_code VARCHAR(10) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert EDA Domain Types
INSERT INTO domains (short_code, full_name, description) VALUES
('PD', 'Physical Design', 'Physical design and layout optimization'),
('RTL', 'Register Transfer Level', 'RTL design and synthesis'),
('DV', 'Design Verification', 'Design verification and validation'),
('CD', 'Clock Design', 'Clock tree synthesis and optimization'),
('CL', 'Custom Layout', 'Custom layout design'),
('DFT', 'Design for Testability', 'Design for test and scan insertion');

-- 4. Projects
CREATE TABLE projects (
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

-- 5. Project-User Mapping (Many-to-Many)
CREATE TABLE project_users (
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

-- 6. Improved PD Raw Data
CREATE TABLE pd_data_raw (
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
    area_um2 DECIMAL(15,2),           -- Changed to DECIMAL for numeric values
    inst_count INT,                    -- Changed to INT
    utilization DECIMAL(5,2),          -- Changed to DECIMAL for percentage
    logs_errors_warnings TEXT,
    run_status ENUM('pass', 'fail', 'continue_with_error', 'running', 'aborted') DEFAULT 'running',
    runtime_seconds INT,               -- Changed to INT for seconds
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

-- Performance Indexes
CREATE INDEX idx_pd_data_project ON pd_data_raw(project_id);
CREATE INDEX idx_pd_data_user ON pd_data_raw(user_id);
CREATE INDEX idx_pd_data_run_end_time ON pd_data_raw(run_end_time);
CREATE INDEX idx_pd_data_run_status ON pd_data_raw(run_status);
CREATE INDEX idx_pd_data_block_name ON pd_data_raw(block_name);
CREATE INDEX idx_projects_domain ON projects(domain_id);
CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);

-- Insert EDA-specific user roles
INSERT INTO user_roles (role_name, description) VALUES 
('Admin', 'System administrator with full access to all projects and data'),
('Engineer', 'Technical engineer with access to assigned projects and data collection'),
('Lead', 'Project lead with oversight responsibilities for assigned projects'),
('Program Manager', 'Program manager with project management and reporting access'),
('Customer', 'Customer with limited read-only access to relevant project data'); 

ALTER TABLE pd_data_raw ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 7. DV (Design Verification) Raw Data
CREATE TABLE dv_data_raw (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    domain_id INT NOT NULL,
    module VARCHAR(100),
    tb_dev_total INT,
    tb_dev_coded INT,
    test_total INT,
    test_coded INT,
    test_pass INT,
    test_fail INT,
    assert_total INT,
    assert_coded INT,
    assert_pass INT,
    assert_fail INT,
    code_coverage_percent DECIMAL(5,2),
    functional_coverage_percent DECIMAL(5,2),
    req_total INT,
    req_covered INT,
    req_uncovered INT,
    block_status ENUM('pass', 'fail', 'in_progress', 'blocked', 'not_started') DEFAULT 'not_started',
    user_id INT NOT NULL,
    run_directory TEXT,
    run_end_time DATETIME,
    stage VARCHAR(100),
    logs_errors_warnings TEXT,
    run_status ENUM('pass', 'fail', 'continue_with_error', 'running', 'aborted') DEFAULT 'running',
    runtime_seconds INT,
    ai_summary TEXT,
    collected_by INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (collected_by) REFERENCES users(id)
);

-- Performance Indexes for DV Data
CREATE INDEX idx_dv_data_project ON dv_data_raw(project_id);
CREATE INDEX idx_dv_data_user ON dv_data_raw(user_id);
CREATE INDEX idx_dv_data_run_end_time ON dv_data_raw(run_end_time);
CREATE INDEX idx_dv_data_block_status ON dv_data_raw(block_status);
CREATE INDEX idx_dv_data_module ON dv_data_raw(module);
CREATE INDEX idx_dv_data_code_coverage ON dv_data_raw(code_coverage_percent);
CREATE INDEX idx_dv_data_functional_coverage ON dv_data_raw(functional_coverage_percent); 

