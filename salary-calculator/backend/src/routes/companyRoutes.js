const express = require('express');
const router = express.Router();
const { recommendCompanies } = require('../services/companyRecommendationService');

router.get('/recommend', (req, res) => {
  const q = req.query;
  const profile = {
    targetTitle: q.targetTitle,
    industry: q.industry,
    specialization: q.specialization,
    skills: q.skills ? String(q.skills).split(',') : [],
  };
  res.json({ companies: recommendCompanies(profile) });
});

router.post('/recommend', (req, res) => {
  res.json({ companies: recommendCompanies(req.body || {}) });
});

module.exports = router;
