/**
 * MyCareersFuture Provider — PLACEHOLDER ONLY
 *
 * MyCareersFuture is a Singapore government job portal. Access its data only
 * through channels the portal permits (official APIs / open data programmes,
 * e.g. via data.gov.sg where applicable). Do not scrape the site itself
 * unless its terms explicitly allow it.
 *
 * HOW TO CONNECT:
 * 1. Check the current MyCareersFuture / data.gov.sg terms for an approved
 *    jobs or wages dataset or API.
 * 2. Implement fetchJobs()/getBenchmarks() against that approved endpoint,
 *    mapping results to the standard record shapes with
 *    sourceType: 'api_connector' and source: 'MyCareersFuture (official)'.
 */
async function fetchJobs(/* query */) {
  // TODO: connect the approved MyCareersFuture / data.gov.sg endpoint here.
  return [];
}

function getBenchmarks() {
  return [];
}

module.exports = {
  name: 'MyCareersFuture',
  type: 'api_connector',
  status: 'not_connected',
  fetchJobs,
  getBenchmarks,
};
