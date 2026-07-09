/**
 * Provider registry. All benchmark queries go through getAllBenchmarks(),
 * so adding a new data source only requires registering it here.
 */
const manualDatasetProvider = require('./manualDatasetProvider');
const uploadedDatasetProvider = require('./uploadedDatasetProvider');
const salaryBenchmarkProvider = require('./salaryBenchmarkProvider');
const jobBoardProvider = require('./jobBoardProvider');
const apifyProvider = require('./apifyProvider');
const glassdoorLikeProvider = require('./glassdoorLikeProvider');
const myCareersFutureProvider = require('./myCareersFutureProvider');
const jobStreetProvider = require('./jobStreetProvider');
const linkedInJobsProvider = require('./linkedInJobsProvider');

const providers = [
  manualDatasetProvider,
  uploadedDatasetProvider,
  salaryBenchmarkProvider,
  jobBoardProvider,
  apifyProvider,
  glassdoorLikeProvider,
  myCareersFutureProvider,
  jobStreetProvider,
  linkedInJobsProvider,
];

function getAllBenchmarks() {
  return providers.flatMap((p) => {
    try {
      return typeof p.getBenchmarks === 'function' ? p.getBenchmarks() : [];
    } catch (err) {
      console.error(`Provider ${p.name} failed:`, err.message);
      return [];
    }
  });
}

function listProviders() {
  return providers.map((p) => ({ name: p.name, type: p.type, status: p.status }));
}

module.exports = { providers, getAllBenchmarks, listProviders, uploadedDatasetProvider };
