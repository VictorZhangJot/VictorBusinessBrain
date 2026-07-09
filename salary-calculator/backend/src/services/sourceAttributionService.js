/**
 * Builds the "where did this number come from" panel: unique sources used
 * in a calculation, plus a whole-dataset summary for GET /api/sources.
 */
const { getAllBenchmarks, listProviders } = require('../providers');

const SOURCE_TYPE_LABELS = {
  job_posting: 'Job posting',
  salary_benchmark_report: 'Salary benchmark report',
  uploaded_csv: 'Uploaded CSV',
  manual_dataset: 'Manual dataset',
  api_connector: 'API connector',
  apify_actor: 'Permitted Apify actor',
};

function attributeSources(matchedBenchmarks) {
  const bySource = new Map();
  matchedBenchmarks.forEach((m) => {
    const key = m.source;
    if (!bySource.has(key)) {
      bySource.set(key, {
        source: m.source,
        sourceType: m.sourceType,
        sourceTypeLabel: SOURCE_TYPE_LABELS[m.sourceType] || m.sourceType,
        sourceDate: m.sourceDate,
        recordsUsed: 0,
        confidenceScore: m.confidenceScore || null,
      });
    }
    const entry = bySource.get(key);
    entry.recordsUsed += 1;
    if (m.sourceDate && (!entry.sourceDate || m.sourceDate > entry.sourceDate)) {
      entry.sourceDate = m.sourceDate;
    }
  });
  return [...bySource.values()].sort((a, b) => b.recordsUsed - a.recordsUsed);
}

function summarizeAllSources() {
  const records = getAllBenchmarks();
  const bySource = {};
  let latestDate = null;
  records.forEach((r) => {
    const key = r.source || 'Unknown';
    if (!bySource[key]) {
      bySource[key] = {
        source: key,
        sourceType: r.sourceType,
        sourceTypeLabel: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
        records: 0,
        latestSourceDate: null,
      };
    }
    bySource[key].records += 1;
    if (r.sourceDate && (!bySource[key].latestSourceDate || r.sourceDate > bySource[key].latestSourceDate)) {
      bySource[key].latestSourceDate = r.sourceDate;
    }
    if (r.sourceDate && (!latestDate || r.sourceDate > latestDate)) latestDate = r.sourceDate;
  });

  return {
    totalRecords: records.length,
    latestSourceDate: latestDate,
    recordsBySource: Object.values(bySource).sort((a, b) => b.records - a.records),
    providers: listProviders(),
  };
}

module.exports = { attributeSources, summarizeAllSources, SOURCE_TYPE_LABELS };
