const express = require('express');
const router = express.Router();
const { recommendJobs } = require('../services/jobRecommendationService');

// POST is the primary form (full profile in body); GET supported for
// simple query-string use, per the API spec.
router.post('/recommend', (req, res) => {
  res.json({ jobs: recommendJobs(req.body || {}) });
});

router.get('/recommend', (req, res) => {
  const q = req.query;
  const profile = {
    targetTitle: q.targetTitle,
    industry: q.industry,
    specialization: q.specialization,
    yearsExperience: q.yearsExperience,
    skills: q.skills ? String(q.skills).split(',') : [],
    salaryExpectation: q.salaryExpectation,
    workArrangement: q.workArrangement,
  };
  res.json({ jobs: recommendJobs(profile) });
});

module.exports = router;
