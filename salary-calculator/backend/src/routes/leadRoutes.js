/**
 * Lead capture. Version 1 stores leads in src/data/leads.json on this
 * machine only — connect a CRM or email service before deploying publicly.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const LEADS_FILE = path.join(__dirname, '..', 'data', 'leads.json');
const RESUME_DIR = path.join(__dirname, '..', 'data', 'resumes');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(RESUME_DIR, { recursive: true });
      cb(null, RESUME_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', upload.single('resume'), (req, res) => {
  const { name, email, phone, targetRole, consent } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (consent !== 'true' && consent !== true) {
    return res.status(400).json({ error: 'Consent is required to request a salary review.' });
  }

  let leads = [];
  try {
    if (fs.existsSync(LEADS_FILE)) leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch { /* start fresh if the file is corrupt */ }

  leads.push({
    name,
    email,
    phone: phone || '',
    targetRole: targetRole || '',
    resumeFile: req.file ? req.file.filename : null,
    submittedAt: new Date().toISOString(),
  });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');

  res.json({ status: 'ok', message: 'Thank you — a JOT recruiter will be in touch shortly.' });
});

// Simple admin view of captured leads.
router.get('/', (req, res) => {
  try {
    const leads = fs.existsSync(LEADS_FILE) ? JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')) : [];
    res.json({ leads });
  } catch {
    res.json({ leads: [] });
  }
});

module.exports = router;
