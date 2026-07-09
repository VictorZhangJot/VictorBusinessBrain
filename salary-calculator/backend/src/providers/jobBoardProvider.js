/**
 * Generic Job Board Provider — PLACEHOLDER
 *
 * Intended for job boards that offer an official API or an explicit data
 * partnership. Do NOT add scraping logic here for platforms whose terms of
 * service prohibit it.
 *
 * HOW TO CONNECT A REAL SOURCE:
 * 1. Sign up for the board's official API / partner programme.
 * 2. Store the API key in an environment variable (never in code).
 * 3. Implement fetchJobs()/getBenchmarks() using the official endpoints,
 *    mapping responses to the shapes in mockJobs.json / mockSalaryBenchmarks.json.
 */
async function fetchJobs(/* query */) {
  // TODO: connect an approved job board API here.
  return [];
}

function getBenchmarks() {
  // TODO: derive salary benchmarks from approved job board data here.
  return [];
}

module.exports = {
  name: 'Job Board API (generic)',
  type: 'api_connector',
  status: 'not_connected',
  fetchJobs,
  getBenchmarks,
};
