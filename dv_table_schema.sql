-- DV (Design Verification) Raw Data Table Schema
-- This table stores verification data for the DV domain

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
    block_status ENUM('pass', 'fail', 'in_progress', 'blocked', 'not_started', 'partial', 'complete') DEFAULT 'not_started',
    collected_by INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (collected_by) REFERENCES users(id)
);

-- Performance Indexes for DV Data
CREATE INDEX idx_dv_data_project ON dv_data_raw(project_id);
CREATE INDEX idx_dv_data_module ON dv_data_raw(module);
CREATE INDEX idx_dv_data_block_status ON dv_data_raw(block_status);
CREATE INDEX idx_dv_data_code_coverage ON dv_data_raw(code_coverage_percent);
CREATE INDEX idx_dv_data_functional_coverage ON dv_data_raw(functional_coverage_percent); 