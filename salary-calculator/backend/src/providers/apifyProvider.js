/**
 * Apify Provider — PLACEHOLDER
 *
 * Intended for Apify actors whose use is legally permitted for the target
 * site (public data, permissive terms, or an explicit agreement).
 *
 * HOW TO CONNECT:
 * 1. Choose an actor whose data collection is permitted for the source site.
 * 2. Store APIFY_TOKEN as an environment variable.
 * 3. Call the actor via the Apify API (https://docs.apify.com/api/v2),
 *    wait for the run to finish, read the dataset items, and map them to
 *    the standard benchmark/job record shapes with sourceType: 'apify_actor'.
 *
 * Compliance note: verify each target site's terms before enabling an actor.
 * This module intentionally ships with no active collection logic.
 */
async function fetchJobs(/* query */) {
  // TODO: run a permitted Apify actor and map its dataset items here.
  return [];
}

function getBenchmarks() {
  // TODO: derive benchmarks from permitted Apify actor output here.
  return [];
}

module.exports = {
  name: 'Apify Actors (permitted only)',
  type: 'apify_actor',
  status: 'not_connected',
  fetchJobs,
  getBenchmarks,
};
