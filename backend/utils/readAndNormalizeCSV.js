const fs = require('fs');
const csv = require('csv-parser');

function normalizeHeader(header) {
  return header
    .replace(/\s+/g, '_')
    .replace(/\W/g, '')
    .toLowerCase();
}

async function readAndNormalizeCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = null;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (csvHeaders) => {
        headers = csvHeaders.map(normalizeHeader);
      })
      .on('data', (row) => {
        if (!headers) {
          headers = Object.keys(row).map(normalizeHeader);
        }
        const normalizedRow = {};
        Object.keys(row).forEach((key, idx) => {
          normalizedRow[headers[idx] || normalizeHeader(key)] = row[key];
        });
        results.push(normalizedRow);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = readAndNormalizeCSV; 