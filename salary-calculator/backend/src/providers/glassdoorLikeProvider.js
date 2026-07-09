/**
 * Glassdoor-like Provider — PLACEHOLDER ONLY
 *
 * Glassdoor and similar salary-review platforms prohibit scraping in their
 * terms of service. Do not add scraping logic to this file.
 *
 * LEGAL WAYS TO CONNECT:
 * - An official Glassdoor partner/API agreement, if granted.
 * - Licensed data exports purchased from the platform.
 * - Aggregated data the platform publishes for reuse.
 *
 * When such access exists, implement getBenchmarks() to map the licensed
 * data to the standard benchmark record shape with an accurate source name,
 * sourceType ('api_connector' or 'salary_benchmark_report') and sourceDate.
 */
function getBenchmarks() {
  // Intentionally empty. See the compliance notes above.
  return [];
}

module.exports = {
  name: 'Glassdoor-like Platforms',
  type: 'api_connector',
  status: 'not_connected',
  getBenchmarks,
};
