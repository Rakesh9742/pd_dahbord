const fs = require('fs');
const path = require('path');

function getCSVFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(file => file.endsWith('.csv'));
}

module.exports = getCSVFiles; 