/**
 * Manual Dataset Provider
 * Serves the manually maintained JOT benchmark dataset stored in
 * src/data/mockSalaryBenchmarks.json. In version 1 this file holds mock data;
 * replace its contents with real, verified benchmark records to go live.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'mockSalaryBenchmarks.json');

function getBenchmarks() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('manualDatasetProvider: failed to read dataset', err.message);
    return [];
  }
}

module.exports = {
  name: 'Manual Dataset (JOT maintained)',
  type: 'manual_dataset',
  status: 'active',
  getBenchmarks,
};
