/**
 * LinkedIn Jobs Provider — PLACEHOLDER ONLY
 *
 * LinkedIn prohibits scraping in its User Agreement. Do not add scraping
 * logic to this file.
 *
 * LEGAL WAYS TO CONNECT:
 * - LinkedIn Talent Solutions / official partner APIs, if granted.
 * - Data the candidate exports themselves and uploads voluntarily.
 *
 * When approved access exists, implement fetchJobs()/getBenchmarks() against
 * the official endpoints and map results to the standard record shapes with
 * sourceType: 'api_connector' and source: 'LinkedIn (official API)'.
 */
async function fetchJobs(/* query */) {
  // Intentionally empty. See the compliance notes above.
  return [];
}

function getBenchmarks() {
  return [];
}

module.exports = {
  name: 'LinkedIn Jobs',
  type: 'api_connector',
  status: 'not_connected',
  fetchJobs,
  getBenchmarks,
};
