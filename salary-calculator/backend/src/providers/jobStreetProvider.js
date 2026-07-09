/**
 * JobStreet Provider — PLACEHOLDER ONLY
 *
 * JobStreet (SEEK group) restricts automated collection in its terms.
 * Do not add scraping logic to this file.
 *
 * LEGAL WAYS TO CONNECT:
 * - SEEK's official partner APIs, if an agreement is in place.
 * - Employer/agency integrations offered by the platform.
 *
 * When approved access exists, implement fetchJobs()/getBenchmarks() against
 * the official endpoints and map results to the standard record shapes with
 * sourceType: 'api_connector' and source: 'JobStreet (official API)'.
 */
async function fetchJobs(/* query */) {
  // Intentionally empty. See the compliance notes above.
  return [];
}

function getBenchmarks() {
  return [];
}

module.exports = {
  name: 'JobStreet',
  type: 'api_connector',
  status: 'not_connected',
  fetchJobs,
  getBenchmarks,
};
