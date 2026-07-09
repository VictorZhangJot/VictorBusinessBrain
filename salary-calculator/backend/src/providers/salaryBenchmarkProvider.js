/**
 * Salary Benchmark Report Provider — PLACEHOLDER
 *
 * Intended for licensed salary benchmark reports (e.g. purchased salary
 * guides, MOM occupational wage data, licensed survey datasets).
 *
 * HOW TO CONNECT A REAL SOURCE:
 * 1. Obtain the report data under a licence that permits this use.
 * 2. Convert it to the standard benchmark record shape (see
 *    mockSalaryBenchmarks.json for the field list).
 * 3. Return those records from getBenchmarks() below, with
 *    sourceType: 'salary_benchmark_report' and an accurate sourceDate.
 *
 * Until then this provider returns an empty list; report-type mock records
 * live in the manual dataset instead.
 */
function getBenchmarks() {
  // TODO: connect licensed benchmark report ingestion here.
  return [];
}

module.exports = {
  name: 'Salary Benchmark Reports',
  type: 'salary_benchmark_report',
  status: 'not_connected',
  getBenchmarks,
};
