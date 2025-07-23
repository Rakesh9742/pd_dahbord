const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const processCSVFile = require('./csvProcessor');
const getCSVFiles = require('./getCSVFiles');

class FileWatcher {
  constructor(db) {
    this.db = db;
    this.watchedDir = path.join(__dirname, '../data_csv');
    this.processedFiles = new Set();
    this.isWatching = false;
  }

  // Initialize file watcher
  async startWatching() {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(this.watchedDir)) {
        fs.mkdirSync(this.watchedDir, { recursive: true });
        console.log(`📁 Created directory: ${this.watchedDir}`);
      }

      // Process existing files first
      await this.processExistingFiles();

      // Start watching for new files
      this.watcher = chokidar.watch(this.watchedDir, {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /processed/, // ignore processed folder
          /.*_processed_.*\.csv$/ // ignore already processed files
        ],
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });

      this.watcher
        .on('add', async (filePath) => {
          console.log(`📄 New file detected: ${path.basename(filePath)}`);
          await this.processNewFile(filePath);
        })
        .on('change', async (filePath) => {
          console.log(`📝 File modified: ${path.basename(filePath)}`);
          await this.processNewFile(filePath);
        })
        .on('unlink', (filePath) => {
          console.log(`🗑️ File removed: ${path.basename(filePath)}`);
          this.processedFiles.delete(filePath);
        })
        .on('error', (error) => {
          console.error('❌ File watcher error:', error);
        })
        .on('ready', () => {
          console.log('👀 File watcher is ready and monitoring for new CSV files...');
          this.isWatching = true;
        });

    } catch (error) {
      console.error('❌ Error starting file watcher:', error);
    }
  }

  // Process existing CSV files in the directory
  async processExistingFiles() {
    try {
      console.log('🔍 Scanning for existing CSV files...');
      const files = getCSVFiles(this.watchedDir);
      
      if (files.length === 0) {
        console.log('📁 No existing CSV files found in directory');
        return;
      }

      console.log(`📊 Found ${files.length} existing CSV file(s)`);
      
      for (const file of files) {
        const filePath = path.join(this.watchedDir, file);
        if (!this.processedFiles.has(filePath)) {
          await this.processNewFile(filePath);
        }
      }

    } catch (error) {
      console.error('❌ Error processing existing files:', error);
    }
  }

  // Process a new or modified CSV file
  async processNewFile(filePath) {
    try {
      // Check if file is CSV
      if (!filePath.toLowerCase().endsWith('.csv')) {
        console.log(`⏭️ Skipping non-CSV file: ${path.basename(filePath)}`);
        return;
      }

      // Skip files that are already in the processed folder
      if (filePath.includes('processed')) {
        console.log(`⏭️ Skipping already processed file: ${path.basename(filePath)}`);
        return;
      }

      // Check if file is still being written (size is changing)
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.log(`⏳ File is empty, waiting for content: ${path.basename(filePath)}`);
        return;
      }

      // Wait a bit to ensure file is completely written
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if file was already processed
      if (this.processedFiles.has(filePath)) {
        console.log(`✅ File already processed: ${path.basename(filePath)}`);
        return;
      }

      console.log(`🔄 Processing file: ${path.basename(filePath)}`);

      // Process the CSV file
      const collectedByUserId = 1; // Default admin user
      await processCSVFile(filePath, this.db, collectedByUserId);
      this.processedFiles.add(filePath);
      // Move processed file to archive folder
      await this.archiveFile(filePath);
    } catch (error) {
      console.error(`❌ Error processing file ${path.basename(filePath)}:`, error);
    }
  }

  // Archive processed files
  async archiveFile(filePath) {
    try {
      const archiveDir = path.join(this.watchedDir, 'processed');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create a clean archived name without multiple "processed" suffixes
      let cleanFileName = fileName;
      if (cleanFileName.includes('_processed_')) {
        cleanFileName = cleanFileName.split('_processed_')[0];
      }
      const archivedName = `${cleanFileName}_processed_${timestamp}.csv`;
      const archivedPath = path.join(archiveDir, archivedName);

      // Check if file exists before trying to rename
      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, archivedPath);
        console.log(`📦 Archived: ${fileName} → ${archivedName}`);
      } else {
        console.log(`⚠️ File no longer exists: ${fileName}`);
      }

    } catch (error) {
      console.error('❌ Error archiving file:', error);
    }
  }

  // Stop watching
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.isWatching = false;
      console.log('🛑 File watcher stopped');
    }
  }

  // Get watcher status
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedDirectory: this.watchedDir,
      processedFilesCount: this.processedFiles.size
    };
  }

  // Get list of processed files
  getProcessedFiles() {
    return Array.from(this.processedFiles);
  }
}

module.exports = FileWatcher; 