# DV (Design Verification) Data Processing

## Overview
The system now supports processing Design Verification (DV) data with domain classification. DV data is automatically detected and stored in the `dv_data_raw` table with specific verification metrics.

## DV Table Schema

The `dv_data_raw` table includes the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | INT | Reference to projects table |
| `domain_id` | INT | Reference to domains table (should be 3 for DV) |
| `module` | VARCHAR(100) | Module name being verified |
| `tb_dev_total` | INT | Total testbench development items |
| `tb_dev_coded` | INT | Coded testbench development items |
| `test_total` | INT | Total tests |
| `test_coded` | INT | Coded tests |
| `test_pass` | INT | Passed tests |
| `test_fail` | INT | Failed tests |
| `assert_total` | INT | Total assertions |
| `assert_coded` | INT | Coded assertions |
| `assert_pass` | INT | Passed assertions |
| `assert_fail` | INT | Failed assertions |
| `code_coverage_percent` | DECIMAL(5,2) | Code coverage percentage |
| `functional_coverage_percent` | DECIMAL(5,2) | Functional coverage percentage |
| `req_total` | INT | Total requirements |
| `req_covered` | INT | Covered requirements |
| `req_uncovered` | INT | Uncovered requirements |
| `block_status` | ENUM | Status: pass, fail, in_progress, blocked, not_started, partial, complete |

## CSV Format for DV Data

Your CSV file should include these columns:

```csv
Project,Module,domain,TB_Dev_Total,TB_Dev_Coded,Test_Total,Test_Coded,Test_Pass,Test_Fail,Assert_Total,Assert_Coded,Assert_Pass,Assert_Fail,Code_Coverage (%),Functional_Coverage (%),Req_Total,Req_Covered,Req_Uncovered,Block_Status
proj1,alu_module,DV,100,85,50,45,42,3,200,180,175,5,85.5,90.2,25,22,3,complete
proj1,control_module,DV,80,70,40,35,32,3,150,140,135,5,78.3,85.1,20,18,2,partial
```

## Domain Classification

The system automatically detects the domain based on the `domain` column:

- **DV** → Domain ID 3 (Design Verification)
- **PD** → Domain ID 1 (Physical Design)
- **RTL** → Domain ID 2 (Register Transfer Level)
- **CD** → Domain ID 4 (Clock Design)
- **CL** → Domain ID 5 (Custom Layout)
- **DFT** → Domain ID 6 (Design for Testability)

## Block Status Options

The `block_status` field supports these values:
- `pass` - Block passed verification
- `fail` - Block failed verification
- `in_progress` - Verification in progress
- `blocked` - Blocked due to issues
- `not_started` - Verification not started
- `partial` - Partially complete
- `complete` - Fully complete

## Automatic Detection

The system automatically detects DV data by checking for:
1. Presence of `module` column
2. Presence of DV-specific columns (`tb_dev_total`, `test_total`, `assert_total`)
3. Domain value set to "DV"

## Processing Flow

1. **File Detection**: CSV file is detected in `data_csv` directory
2. **Data Validation**: Rows are validated for required fields
3. **Domain Classification**: Domain is determined from CSV data
4. **Project Creation**: Project is created or found in the appropriate domain
5. **Data Insertion**: Data is inserted into `dv_data_raw` table
6. **Duplicate Prevention**: Duplicate entries are skipped

## Example Usage

1. Place your DV CSV file in the `backend/data_csv/` directory
2. The file will be automatically processed
3. Data will be stored in the `dv_data_raw` table
4. Check logs for processing status

## SQL Query to Create DV Table

```sql
-- Execute this SQL to create the DV table
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

-- Performance Indexes
CREATE INDEX idx_dv_data_project ON dv_data_raw(project_id);
CREATE INDEX idx_dv_data_module ON dv_data_raw(module);
CREATE INDEX idx_dv_data_block_status ON dv_data_raw(block_status);
CREATE INDEX idx_dv_data_code_coverage ON dv_data_raw(code_coverage_percent);
CREATE INDEX idx_dv_data_functional_coverage ON dv_data_raw(functional_coverage_percent);
``` 