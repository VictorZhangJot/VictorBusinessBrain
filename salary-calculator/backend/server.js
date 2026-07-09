const express = require('express');
const cors = require('cors');
const path = require('path');

const salaryRoutes = require('./src/routes/salaryRoutes');
const jobRoutes = require('./src/routes/jobRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const sourceRoutes = require('./src/routes/sourceRoutes');
const leadRoutes = require('./src/routes/leadRoutes');

const app = express();
const PORT = process.env.PORT || 4840;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/salary', salaryRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/leads', leadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'JOT Singapore Salary Calculator API' });
});

app.listen(PORT, () => {
  console.log(`JOT Salary Calculator API running on http://localhost:${PORT}`);
});
