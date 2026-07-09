const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const router = express.Router();
const { uploadedDatasetProvider } = require('../providers');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const REQUIRED_SALARY_FIELDS = [
  'p25SalaryMonthly',
  'p50SalaryMonthly',
  'p75SalaryMonthly',
  'p90SalaryMonthly',
  'topMarketSalaryMonthly',
];

function validateRow(row, index) {
  const errors = [];
  const warnings = [];
  const rowNo = index + 2; // +1 for header, +1 for 1-based

  if (!row.title || !String(row.title).trim()) {
    errors.push(`Row ${rowNo}: missing title`);
  }

  REQUIRED_SALARY_FIELDS.forEach((field) => {
    const raw = row[field];
    if (raw == null || String(raw).trim() === '') {
      errors.push(`Row ${rowNo}: missing salary field "${field}"`);
    } else {
      const num = Number(String(raw).replace(/[$,\s]/g, ''));
      if (Number.isNaN(num) || num <= 0) {
        errors.push(`Row ${rowNo}: invalid salary number in "${field}" (${raw})`);
      } else {
        row[field] = num;
      }
    }
  });

  if (row.sourceDate) {
    const d = new Date(row.sourceDate);
    if (Number.isNaN(d.getTime())) {
      errors.push(`Row ${rowNo}: invalid source date "${row.sourceDate}" (use YYYY-MM-DD)`);
    }
  } else {
    errors.push(`Row ${rowNo}: missing source date`);
  }

  const loc = `${row.country || ''} ${row.location || ''}`.toLowerCase();
  if (!loc.includes('singapore')) {
    warnings.push(
      `Row ${rowNo}: location is not Singapore ("${row.location || row.country || 'blank'}") — the calculator only uses Singapore records`
    );
  }

  return { errors, warnings };
}

/**
 * POST /api/admin/upload-salary-csv  (multipart, field name: "file")
 * Validates each row, appends valid rows to the uploaded dataset,
 * returns counts plus per-row errors/warnings.
 */
router.post('/upload-salary-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a CSV as the "file" field.' });
  }

  const parsed = Papa.parse(req.file.buffer.toString('utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length && !parsed.data.length) {
    return res.status(400).json({ error: 'Could not parse the CSV file.', details: parsed.errors.slice(0, 5) });
  }

  const validRows = [];
  const allErrors = [];
  const allWarnings = [];

  parsed.data.forEach((row, i) => {
    const { errors, warnings } = validateRow(row, i);
    allWarnings.push(...warnings);
    if (errors.length) {
      allErrors.push(...errors);
      return;
    }
    validRows.push({
      title: String(row.title).trim(),
      normalizedTitle: (row.normalizedTitle || row.title).toLowerCase().trim(),
      industry: row.industry || '',
      specialization: row.specialization || '',
      seniority: row.seniority || '',
      yearsExperienceMin: Number(row.yearsExperienceMin) || 0,
      yearsExperienceMax: Number(row.yearsExperienceMax) || 30,
      qualification: row.qualification || '',
      skills: row.skills ? String(row.skills).split(/[;|,]/).map((s) => s.trim()).filter(Boolean) : [],
      p25SalaryMonthly: row.p25SalaryMonthly,
      p50SalaryMonthly: row.p50SalaryMonthly,
      p75SalaryMonthly: row.p75SalaryMonthly,
      p90SalaryMonthly: row.p90SalaryMonthly,
      topMarketSalaryMonthly: row.topMarketSalaryMonthly,
      source: row.source || `Uploaded CSV (${new Date().toISOString().slice(0, 10)})`,
      sourceType: 'uploaded_csv',
      sourceDate: row.sourceDate,
      country: row.country || 'Singapore',
      location: row.location || 'Singapore',
      confidenceScore: Number(row.confidenceScore) || 70,
      uploadedAt: new Date().toISOString(),
    });
  });

  if (validRows.length) {
    uploadedDatasetProvider.appendBenchmarks(validRows);
  }

  res.json({
    status: validRows.length ? 'ok' : 'rejected',
    validRows: validRows.length,
    rejectedRows: parsed.data.length - validRows.length,
    validationErrors: allErrors,
    warnings: allWarnings,
  });
});

module.exports = router;
