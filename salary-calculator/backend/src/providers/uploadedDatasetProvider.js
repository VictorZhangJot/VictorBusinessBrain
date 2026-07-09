/**
 * Uploaded Dataset Provider
 * Serves benchmark records uploaded through the admin CSV upload page.
 * Validated rows are appended to src/data/uploadedBenchmarks.json by
 * the admin route; this provider simply reads them back.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'uploadedBenchmarks.json');

function getBenchmarks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('uploadedDatasetProvider: failed to read dataset', err.message);
    return [];
  }
}

function appendBenchmarks(rows) {
  const existing = getBenchmarks();
  const merged = existing.concat(rows);
  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged.length;
}

module.exports = {
  name: 'Uploaded CSV Benchmarks',
  type: 'uploaded_csv',
  status: 'active',
  getBenchmarks,
  appendBenchmarks,
};
