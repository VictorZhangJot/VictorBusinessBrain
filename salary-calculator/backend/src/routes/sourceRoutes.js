const express = require('express');
const router = express.Router();
const { summarizeAllSources } = require('../services/sourceAttributionService');

// GET /api/sources — available data sources, latest date, records by source.
router.get('/', (req, res) => {
  res.json(summarizeAllSources());
});

module.exports = router;
