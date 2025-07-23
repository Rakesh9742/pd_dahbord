const classifyDomain = require('./domainClassifier');
const PDProcessor = require('./pdProcessor');
const DVProcessor = require('./dvProcessor');
const readAndNormalizeCSV = require('./readAndNormalizeCSV');

const processors = {
  PD: new PDProcessor(),
  DV: new DVProcessor(),
  // Add more as you implement them
};

async function processCSVFile(filePath, db, userId) {
  const rows = await readAndNormalizeCSV(filePath);
  // Group rows by domain
  const domainGroups = {};
  for (const row of rows) {
    const domain = classifyDomain(row);
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(row);
  }
  // Process each domain group
  for (const [domain, domainRows] of Object.entries(domainGroups)) {
    if (processors[domain]) {
      await processors[domain].process(domainRows, db, userId);
    } else {
      console.warn(`[csvProcessor] No processor for domain: ${domain}. Rows skipped.`);
    }
  }
}

module.exports = processCSVFile; 