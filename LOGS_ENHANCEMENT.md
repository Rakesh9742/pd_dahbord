# Enhanced Logs System

## Overview

The enhanced logs system provides a comprehensive logging solution with modern UI, real-time monitoring, and advanced filtering capabilities. The system includes multiple components for different use cases:

## Components

### 1. EnhancedLogs Component
- **Location**: `frontend/src/components/EnhancedLogs.jsx`
- **Features**:
  - Advanced filtering by log level, file, and search terms
  - Pagination support
  - Auto-refresh functionality
  - Export logs to CSV
  - Clear logs functionality
  - Modern UI with gradient backgrounds

### 2. LogsDashboard Component
- **Location**: `frontend/src/components/LogsDashboard.jsx`
- **Features**:
  - Overview statistics (total logs, errors, warnings, info)
  - File listing with logs
  - Recent activity feed
  - Visual indicators for different log levels

### 3. RealTimeLogs Component
- **Location**: `frontend/src/components/RealTimeLogs.jsx`
- **Features**:
  - Real-time log streaming (2-second polling)
  - Connection status indicator
  - Auto-scroll functionality
  - Live filtering and search
  - Export and clear capabilities

### 4. LogsNavigation Component
- **Location**: `frontend/src/components/LogsNavigation.jsx`
- **Features**:
  - Tab-based navigation between different log views
  - Seamless switching between Overview, Detailed Logs, and Real-Time views

## Backend Enhancements

### 1. Logger Utility
- **Location**: `backend/utils/logger.js`
- **Features**:
  - Structured logging with timestamps and file names
  - Multiple log levels (error, warning, info)
  - Separate log files for different levels
  - Log statistics and filtering
  - Log clearing functionality

### 2. Enhanced API Endpoints
- **Location**: `backend/routes/duplicateErrors.js`
- **Endpoints**:
  - `GET /api/data/logs` - Get logs with filtering and pagination
  - `GET /api/data/logs/stats` - Get log statistics
  - `DELETE /api/data/logs/clear` - Clear all logs
  - `GET /api/data/duplicate-errors` - Legacy endpoint for backward compatibility

## Features

### UI Features
- **Modern Design**: Gradient backgrounds and glass-morphism effects
- **Responsive Layout**: Works on desktop and mobile devices
- **Real-time Updates**: Auto-refresh and live connection status
- **Advanced Filtering**: Filter by level, file, and search terms
- **Export Functionality**: Download logs as CSV files
- **Pagination**: Handle large log volumes efficiently

### Backend Features
- **Structured Logging**: Consistent log format with timestamps
- **Multiple Log Files**: Separate files for errors, warnings, and info
- **Log Statistics**: Real-time statistics and analytics
- **Filtering & Search**: Server-side filtering and search capabilities
- **Log Management**: Clear logs and manage log files

### Real-time Features
- **Live Polling**: 2-second intervals for real-time updates
- **Connection Status**: Visual indicator for connection health
- **Auto-scroll**: Automatic scrolling to latest logs
- **Live Filtering**: Real-time filtering without page refresh

## Usage

### Accessing Logs
1. Navigate to the "Logs" section in the main dashboard
2. Choose between three views:
   - **Overview**: Statistics and recent activity
   - **Detailed Logs**: Full log browsing with filters
   - **Real-Time**: Live log streaming

### Filtering Logs
- **By Level**: Filter by Error, Warning, or Info
- **By File**: Filter by specific file names
- **By Search**: Search within log messages
- **Combined**: Use multiple filters simultaneously

### Exporting Logs
- Click the "Export CSV" button to download filtered logs
- Exports include timestamp, file, level, and message columns

### Clearing Logs
- Use the "Clear Logs" button to remove all logs
- Confirmation dialog prevents accidental clearing

## Log Format

Logs are stored in a structured format:
```
[2024-01-15T10:30:45.123Z] [filename.csv] [ERROR] Duplicate entry: project=test, block=block1, experiment=exp1, run_end_time=2024-01-15
```

### Log Components
- **Timestamp**: ISO 8601 format
- **File Name**: Source file or system component
- **Level**: ERROR, WARNING, or INFO
- **Message**: Human-readable log message

## Configuration

### Frontend Configuration
- **Auto-refresh**: Configurable refresh intervals
- **Page Size**: Adjustable pagination limits
- **UI Theme**: Gradient colors and styling

### Backend Configuration
- **Log Directory**: `backend/logs/`
- **Log Files**: 
  - `logs.log` - Main log file
  - `errors.log` - Error logs only
  - `info.log` - Info logs only
- **Polling Interval**: 2 seconds for real-time updates

## API Reference

### GET /api/data/logs
Get logs with optional filtering and pagination.

**Query Parameters**:
- `level` (optional): Filter by log level (error, warning, info, all)
- `file` (optional): Filter by file name
- `search` (optional): Search within log messages
- `limit` (optional): Number of logs to return (default: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "errors": ["log entries..."],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### GET /api/data/logs/stats
Get log statistics and overview.

**Response**:
```json
{
  "totalLogs": 150,
  "errorCount": 25,
  "warningCount": 15,
  "infoCount": 110,
  "files": ["file1.csv", "file2.csv"],
  "recentActivity": [
    {
      "timestamp": "2024-01-15T10:30:45.123Z",
      "file": "file1.csv",
      "level": "error",
      "message": "Duplicate entry..."
    }
  ]
}
```

### DELETE /api/data/logs/clear
Clear all logs.

**Response**:
```json
{
  "message": "Logs cleared successfully"
}
```

## Styling

The logs system uses a consistent design language:
- **Gradient Backgrounds**: Blue gradient theme
- **Glass-morphism**: Translucent elements with backdrop blur
- **Color Coding**: 
  - Errors: Red (#f44336)
  - Warnings: Orange (#ff9800)
  - Info: Blue (#2196f3)
- **Responsive Design**: Mobile-friendly layouts

## Performance Considerations

- **Pagination**: Large log files are paginated to prevent memory issues
- **Filtering**: Server-side filtering reduces data transfer
- **Real-time Updates**: Efficient polling with configurable intervals
- **Export**: Streaming CSV generation for large datasets

## Security

- **Authentication**: All log endpoints require authentication
- **Authorization**: Log access controlled by user roles
- **Input Validation**: All search and filter inputs are validated
- **Error Handling**: Comprehensive error handling and logging

## Future Enhancements

- **WebSocket Support**: Real-time updates via WebSocket
- **Log Retention**: Automatic log rotation and cleanup
- **Advanced Analytics**: Log pattern analysis and alerts
- **Integration**: Integration with external monitoring systems
- **Search Indexing**: Full-text search capabilities
- **Log Aggregation**: Support for multiple log sources 