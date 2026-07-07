// FlowRecruit X — seed database (ALL DATA FICTIONAL, for demo purposes)
'use strict';

const now = Date.now();
const day = 86400000;
const ago = (d) => new Date(now - d * day).toISOString();

const USERS = [
  { id: 'u1', name: 'Alex Tan', role: 'Admin', email: 'alex@flowrecruit.demo', color: '#6455FF' },
  { id: 'u2', name: 'Priya Nair', role: 'Recruiter', email: 'priya@flowrecruit.demo', color: '#007BFF' },
  { id: 'u3', name: 'Marcus Lee', role: 'BD Manager', email: 'marcus@flowrecruit.demo', color: '#FF9D28' },
];

const COMPANIES = [
  { id: 'co1', name: 'Nimbus Health', industry: 'Healthcare Tech', location: 'Singapore', size: '200-500', website: 'nimbushealth.demo', tier: 'A', signal: 'Raised Series C, expanding clinical engineering team', ownerId: 'u3' },
  { id: 'co2', name: 'Vertex Data Centres', industry: 'Data Centres', location: 'Singapore', size: '500-1000', website: 'vertexdc.demo', tier: 'A', signal: 'Building 2 new hyperscale facilities in Johor', ownerId: 'u3' },
  { id: 'co3', name: 'Kite Financial', industry: 'Fintech', location: 'Singapore', size: '50-200', website: 'kitefin.demo', tier: 'B', signal: 'New CTO hired last quarter', ownerId: 'u1' },
  { id: 'co4', name: 'Aurora Robotics', industry: 'Robotics / AI', location: 'Singapore', size: '50-200', website: 'aurorarobotics.demo', tier: 'A', signal: 'Opened APAC HQ, hiring ML platform team', ownerId: 'u3' },
  { id: 'co5', name: 'Meridian Hospital Group', industry: 'Healthcare', location: 'Singapore', size: '1000+', website: 'meridianhg.demo', tier: 'A', signal: 'New oncology wing opening Q4', ownerId: 'u2' },
  { id: 'co6', name: 'PolarGrid Energy', industry: 'Energy / Infrastructure', location: 'Kuala Lumpur', size: '200-500', website: 'polargrid.demo', tier: 'B', signal: 'Grid modernisation programme announced', ownerId: 'u3' },
  { id: 'co7', name: 'Lumen Analytics', industry: 'AI / SaaS', location: 'Remote / APAC', size: '10-50', website: 'lumenanalytics.demo', tier: 'C', signal: 'Seed funded, first data hires', ownerId: 'u1' },
  { id: 'co8', name: 'Harbourline Logistics', industry: 'Logistics', location: 'Singapore', size: '500-1000', website: 'harbourline.demo', tier: 'B', signal: 'Automating warehouse operations', ownerId: 'u3' },
  { id: 'co9', name: 'Cobalt Semiconductor', industry: 'Semiconductors', location: 'Penang', size: '1000+', website: 'cobaltsemi.demo', tier: 'A', signal: 'New fab line, 300 headcount plan', ownerId: 'u2' },
  { id: 'co10', name: 'Willow & Sage Clinics', industry: 'Healthcare', location: 'Singapore', size: '50-200', website: 'willowsage.demo', tier: 'C', signal: 'Two new clinic openings', ownerId: 'u2' },
];

const CONTACTS = [
  { id: 'ct1', name: 'Dr. Hannah Wong', title: 'VP Engineering', companyId: 'co1', email: 'hannah@nimbushealth.demo', phone: '+65 8000 0001', ownerId: 'u3', temperature: 'Warm' },
  { id: 'ct2', name: 'Jason Krishnan', title: 'Head of Talent', companyId: 'co1', email: 'jason@nimbushealth.demo', phone: '+65 8000 0002', ownerId: 'u3', temperature: 'Hot' },
  { id: 'ct3', name: 'Melissa Chua', title: 'HR Director', companyId: 'co2', email: 'melissa@vertexdc.demo', phone: '+65 8000 0003', ownerId: 'u3', temperature: 'Hot' },
  { id: 'ct4', name: 'Daniel Foo', title: 'Facilities Director', companyId: 'co2', email: 'daniel@vertexdc.demo', phone: '+65 8000 0004', ownerId: 'u1', temperature: 'Warm' },
  { id: 'ct5', name: 'Grace Lim', title: 'COO', companyId: 'co3', email: 'grace@kitefin.demo', phone: '+65 8000 0005', ownerId: 'u1', temperature: 'Cold' },
  { id: 'ct6', name: 'Dr. Ravi Menon', title: 'Chief of Staff', companyId: 'co5', email: 'ravi@meridianhg.demo', phone: '+65 8000 0006', ownerId: 'u2', temperature: 'Warm' },
  { id: 'ct7', name: 'Sofia Alvarez', title: 'Head of ML Platform', companyId: 'co4', email: 'sofia@aurorarobotics.demo', phone: '+65 8000 0007', ownerId: 'u3', temperature: 'Hot' },
  { id: 'ct8', name: 'Ben Ong', title: 'Talent Acquisition Lead', companyId: 'co4', email: 'ben@aurorarobotics.demo', phone: '+65 8000 0008', ownerId: 'u3', temperature: 'Warm' },
  { id: 'ct9', name: 'Farah Aziz', title: 'HR Business Partner', companyId: 'co6', email: 'farah@polargrid.demo', phone: '+60 1000 0009', ownerId: 'u3', temperature: 'Cold' },
  { id: 'ct10', name: 'Tom Nakamura', title: 'Founder & CEO', companyId: 'co7', email: 'tom@lumenanalytics.demo', phone: '+65 8000 0010', ownerId: 'u1', temperature: 'Warm' },
  { id: 'ct11', name: 'Cheryl Goh', title: 'Ops Director', companyId: 'co8', email: 'cheryl@harbourline.demo', phone: '+65 8000 0011', ownerId: 'u3', temperature: 'Warm' },
  { id: 'ct12', name: 'Vikram Pillai', title: 'Plant HR Manager', companyId: 'co9', email: 'vikram@cobaltsemi.demo', phone: '+60 1000 0012', ownerId: 'u2', temperature: 'Hot' },
  { id: 'ct13', name: 'Dr. Emily Tay', title: 'Medical Director', companyId: 'co10', email: 'emily@willowsage.demo', phone: '+65 8000 0013', ownerId: 'u2', temperature: 'Warm' },
  { id: 'ct14', name: 'Marcus Vane', title: 'Head of Infrastructure', companyId: 'co2', email: 'mvane@vertexdc.demo', phone: '+65 8000 0014', ownerId: 'u1', temperature: 'Cold' },
];

// Candidate generation: hand-crafted core + generated breadth
const CORE_CANDIDATES = [
  { name: 'Wei Jie Lim', title: 'Senior Data Centre Engineer', skills: ['Data Centre Operations', 'HVAC', 'Electrical Systems', 'DCIM', 'Uptime Tier Standards', 'BMS'], location: 'Singapore', years: 9, salary: 110000, source: 'LinkedIn', status: 'Active', current: 'Vertex Data Centres' },
  { name: 'Ananya Sharma', title: 'Machine Learning Engineer', skills: ['Python', 'PyTorch', 'MLOps', 'Kubernetes', 'AWS', 'LLM Fine-tuning'], location: 'Singapore', years: 6, salary: 145000, source: 'Referral', status: 'Active', current: 'Lumen Analytics' },
  { name: 'Sarah Koh', title: 'Senior Staff Nurse (Oncology)', skills: ['Oncology Nursing', 'Chemotherapy Administration', 'Patient Care', 'BCLS', 'Palliative Care'], location: 'Singapore', years: 8, salary: 72000, source: 'Job Board', status: 'Active', current: 'Meridian Hospital Group' },
  { name: 'Darren Yap', title: 'DevOps Engineer', skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Python', 'Docker'], location: 'Singapore', years: 5, salary: 105000, source: 'LinkedIn', status: 'Passive', current: 'Kite Financial' },
  { name: 'Mei Ling Tan', title: 'Clinical Research Coordinator', skills: ['Clinical Trials', 'GCP', 'Patient Recruitment', 'Data Management', 'Regulatory Submissions'], location: 'Singapore', years: 4, salary: 62000, source: 'Job Board', status: 'Active', current: 'Nimbus Health' },
  { name: 'Rajesh Kumar', title: 'Critical Facilities Manager', skills: ['Data Centre Operations', 'Critical Facilities', 'Vendor Management', 'Uptime Tier Standards', 'Electrical Systems', 'Generators'], location: 'Singapore', years: 12, salary: 135000, source: 'Headhunted', status: 'Passive', current: 'PolarGrid Energy' },
  { name: 'Jessica Ng', title: 'Full Stack Developer', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'GraphQL', 'AWS'], location: 'Singapore', years: 4, salary: 90000, source: 'GitHub', status: 'Active', current: 'Harbourline Logistics' },
  { name: 'Ahmad Faizal', title: 'Electrical Design Engineer', skills: ['Electrical Systems', 'AutoCAD', 'Power Distribution', 'Switchgear', 'Data Centre Design'], location: 'Kuala Lumpur', years: 7, salary: 85000, source: 'Job Board', status: 'Active', current: 'Cobalt Semiconductor' },
  { name: 'Chloe Zhang', title: 'AI Product Manager', skills: ['Product Management', 'LLM Applications', 'Roadmapping', 'SQL', 'Stakeholder Management', 'Agile'], location: 'Singapore', years: 7, salary: 130000, source: 'LinkedIn', status: 'Passive', current: 'Aurora Robotics' },
  { name: 'Benjamin Chew', title: 'Registered Nurse (ICU)', skills: ['ICU Nursing', 'Critical Care', 'Ventilator Management', 'ACLS', 'Patient Care'], location: 'Singapore', years: 6, salary: 68000, source: 'Referral', status: 'Active', current: 'Willow & Sage Clinics' },
  { name: 'Nurul Huda', title: 'Data Engineer', skills: ['Python', 'Spark', 'Airflow', 'SQL', 'dbt', 'GCP'], location: 'Singapore', years: 5, salary: 98000, source: 'LinkedIn', status: 'Active', current: 'Kite Financial' },
  { name: 'Kenji Watanabe', title: 'Site Reliability Engineer', skills: ['Kubernetes', 'Go', 'Prometheus', 'Terraform', 'GCP', 'Incident Management'], location: 'Remote / APAC', years: 8, salary: 150000, source: 'GitHub', status: 'Passive', current: 'Lumen Analytics' },
];

const FIRST = ['Aaron', 'Bella', 'Colin', 'Devi', 'Ethan', 'Fiona', 'Gavin', 'Hui Min', 'Irfan', 'Jolene', 'Kai', 'Li Wei', 'Maya', 'Nicholas', 'Olivia', 'Pranav', 'Qi Hao', 'Rachel', 'Samuel', 'Tara', 'Umar', 'Vanessa', 'Wen Xin', 'Yusof', 'Zoe', 'Harith', 'Shalini', 'Dominic'];
const LAST = ['Teo', 'Rao', 'Lau', 'Begum', 'Cheong', 'Dsouza', 'Han', 'Ismail', 'Jain', 'Kwok', 'Leong', 'Mohan', 'Neo', 'Oh', 'Phua', 'Quek', 'Rahman', 'Sim', 'Toh', 'Verma', 'Wee', 'Xu', 'Yeo', 'Zainal', 'Chandra', 'Bakar', 'Goh', 'Sng'];

const ROLE_POOL = [
  { title: 'Frontend Developer', skills: ['React', 'TypeScript', 'CSS', 'Next.js', 'Testing'], sal: [70000, 110000] },
  { title: 'Backend Engineer', skills: ['Node.js', 'PostgreSQL', 'Redis', 'API Design', 'Docker'], sal: [80000, 125000] },
  { title: 'Data Scientist', skills: ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas'], sal: [90000, 140000] },
  { title: 'ML Engineer', skills: ['Python', 'PyTorch', 'MLOps', 'Kubernetes', 'LLM Fine-tuning'], sal: [110000, 160000] },
  { title: 'Staff Nurse', skills: ['Patient Care', 'BCLS', 'Medication Administration', 'Ward Nursing'], sal: [50000, 70000] },
  { title: 'Nurse Manager', skills: ['Nursing Leadership', 'Patient Care', 'Rostering', 'Quality Improvement'], sal: [75000, 95000] },
  { title: 'Data Centre Technician', skills: ['Data Centre Operations', 'Rack & Stack', 'Cabling', 'BMS'], sal: [45000, 65000] },
  { title: 'Mechanical Engineer (HVAC)', skills: ['HVAC', 'Chillers', 'Mechanical Design', 'Data Centre Design'], sal: [70000, 100000] },
  { title: 'Cloud Architect', skills: ['AWS', 'Terraform', 'Kubernetes', 'Solution Architecture', 'Security'], sal: [140000, 190000] },
  { title: 'Product Designer', skills: ['Figma', 'UX Research', 'Design Systems', 'Prototyping'], sal: [75000, 115000] },
  { title: 'QA Engineer', skills: ['Test Automation', 'Playwright', 'CI/CD', 'API Testing'], sal: [65000, 95000] },
  { title: 'Cybersecurity Analyst', skills: ['SIEM', 'Incident Response', 'Threat Hunting', 'Security'], sal: [85000, 130000] },
  { title: 'Radiographer', skills: ['Radiography', 'CT', 'MRI', 'Patient Care'], sal: [55000, 80000] },
  { title: 'Pharmacist', skills: ['Pharmacy', 'Dispensing', 'Clinical Pharmacy', 'Patient Counselling'], sal: [65000, 95000] },
];

const LOCS = ['Singapore', 'Singapore', 'Singapore', 'Kuala Lumpur', 'Remote / APAC', 'Jakarta', 'Penang'];
const SOURCES = ['LinkedIn', 'Job Board', 'Referral', 'GitHub', 'Headhunted', 'Career Site'];
const EMPLOYERS = ['Meridian Hospital Group', 'Vertex Data Centres', 'Kite Financial', 'Aurora Robotics', 'Harbourline Logistics', 'Cobalt Semiconductor', 'Independent', 'Nimbus Health'];

function genCandidates() {
  const out = [];
  let i = 0;
  CORE_CANDIDATES.forEach((c, idx) => {
    out.push(makeCandidate('c' + (++i), c.name, c.title, c.skills, c.location, c.years, c.salary, c.source, c.status, c.current, idx));
  });
  for (let g = 0; g < 28; g++) {
    const role = ROLE_POOL[g % ROLE_POOL.length];
    const name = FIRST[g % FIRST.length] + ' ' + LAST[(g * 3 + 5) % LAST.length];
    const years = 2 + ((g * 7) % 14);
    const sal = role.sal[0] + Math.round(((role.sal[1] - role.sal[0]) * ((g * 13) % 10)) / 10);
    out.push(makeCandidate('c' + (++i), name, role.title, role.skills, LOCS[g % LOCS.length], years, sal, SOURCES[g % SOURCES.length], g % 3 === 0 ? 'Passive' : 'Active', EMPLOYERS[g % EMPLOYERS.length], 12 + g));
  }
  return out;
}

function makeCandidate(id, name, title, skills, location, years, salary, source, status, current, seed) {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
  return {
    id, name, title, skills, location,
    experienceYears: years,
    salaryExpectation: salary,
    currency: 'SGD',
    source, status,
    currentEmployer: current,
    email: slug + '@candidate.demo',
    phone: '+65 9' + String(100000 + seed * 137).slice(0, 3) + ' ' + String(1000 + seed * 61).slice(0, 4),
    linkedin: 'linkedin.com/in/' + slug.replace(/\./g, '-') + '-demo',
    tags: [skills[0], location.split(' ')[0]],
    ownerId: USERS[seed % 3].id,
    rating: 3 + (seed % 3),
    openToWork: status === 'Active',
    noticePeriod: ['Immediate', '1 month', '2 months', '3 months'][seed % 4],
    summary: `${title} with ${years} years of experience, currently at ${current}. Core strengths in ${skills.slice(0, 3).join(', ')}. Based in ${location}.`,
    workHistory: [
      { company: current, title, from: 2026 - Math.min(years, 4), to: 'Present' },
      { company: EMPLOYERS[(seed + 3) % EMPLOYERS.length], title: title.replace('Senior ', ''), from: 2026 - years, to: 2026 - Math.min(years, 4) },
    ],
    education: seed % 2 === 0 ? 'BSc, National University of Singapore' : 'BEng, Nanyang Technological University',
    createdAt: ago(60 - seed),
    lastActivityAt: ago(seed % 14),
  };
}

const CANDIDATES = genCandidates();

const STAGES = ['Sourced', 'Screened', 'Submitted', 'Interview', 'Offer', 'Placed'];

const JOBS = [
  { id: 'j1', title: 'Senior Data Centre Engineer', companyId: 'co2', location: 'Singapore', type: 'Permanent', salaryMin: 95000, salaryMax: 130000, skills: ['Data Centre Operations', 'HVAC', 'Electrical Systems', 'DCIM'], status: 'Open', priority: 'High', fee: 22, openings: 2, ownerId: 'u1', description: 'Own critical facility operations across two hyperscale sites. Lead shift teams, manage uptime against Tier III+ standards, and drive DCIM adoption.', createdAt: ago(21) },
  { id: 'j2', title: 'ML Platform Engineer', companyId: 'co4', location: 'Singapore', type: 'Permanent', salaryMin: 120000, salaryMax: 165000, skills: ['Python', 'PyTorch', 'MLOps', 'Kubernetes', 'LLM Fine-tuning'], status: 'Open', priority: 'High', fee: 25, openings: 3, ownerId: 'u2', description: 'Build the training and serving platform for robotic perception models. Strong MLOps and Kubernetes background required.', createdAt: ago(18) },
  { id: 'j3', title: 'Senior Staff Nurse — Oncology', companyId: 'co5', location: 'Singapore', type: 'Permanent', salaryMin: 62000, salaryMax: 80000, skills: ['Oncology Nursing', 'Chemotherapy Administration', 'Patient Care'], status: 'Open', priority: 'Urgent', fee: 18, openings: 6, ownerId: 'u2', description: 'New oncology wing opening Q4. Six senior positions with leadership pathway. SNB registration required.', createdAt: ago(14) },
  { id: 'j4', title: 'DevOps Engineer', companyId: 'co3', location: 'Singapore', type: 'Permanent', salaryMin: 90000, salaryMax: 120000, skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'], status: 'Open', priority: 'Medium', fee: 20, openings: 1, ownerId: 'u1', description: 'Own infrastructure-as-code and deployment pipelines for a payments platform handling regulated workloads.', createdAt: ago(12) },
  { id: 'j5', title: 'Critical Facilities Manager', companyId: 'co2', location: 'Johor / Singapore', type: 'Permanent', salaryMin: 120000, salaryMax: 150000, skills: ['Critical Facilities', 'Data Centre Operations', 'Vendor Management', 'Generators'], status: 'Open', priority: 'High', fee: 22, openings: 1, ownerId: 'u1', description: 'Lead commissioning and steady-state ops for a new hyperscale campus. 10+ years in critical environments.', createdAt: ago(10) },
  { id: 'j6', title: 'Data Engineer', companyId: 'co7', location: 'Remote / APAC', type: 'Contract', salaryMin: 84000, salaryMax: 110000, skills: ['Python', 'Airflow', 'SQL', 'dbt'], status: 'Open', priority: 'Medium', fee: 18, openings: 2, ownerId: 'u3', description: 'First data hires post-seed. Build the analytics stack from scratch: ingestion, modelling, BI.', createdAt: ago(8) },
  { id: 'j7', title: 'Clinical Research Coordinator', companyId: 'co1', location: 'Singapore', type: 'Permanent', salaryMin: 55000, salaryMax: 70000, skills: ['Clinical Trials', 'GCP', 'Regulatory Submissions'], status: 'Open', priority: 'Medium', fee: 18, openings: 2, ownerId: 'u2', description: 'Coordinate multi-site oncology trials. GCP certification and 3+ years in clinical research required.', createdAt: ago(7) },
  { id: 'j8', title: 'ICU Registered Nurse', companyId: 'co5', location: 'Singapore', type: 'Permanent', salaryMin: 58000, salaryMax: 75000, skills: ['ICU Nursing', 'Critical Care', 'ACLS'], status: 'Open', priority: 'Urgent', fee: 18, openings: 4, ownerId: 'u2', description: 'ICU expansion — 4 positions. ACLS certified, minimum 3 years critical care experience.', createdAt: ago(5) },
  { id: 'j9', title: 'Electrical Engineer — Fab Expansion', companyId: 'co9', location: 'Penang', type: 'Permanent', salaryMin: 75000, salaryMax: 100000, skills: ['Electrical Systems', 'Power Distribution', 'Switchgear'], status: 'Open', priority: 'Medium', fee: 20, openings: 3, ownerId: 'u1', description: 'New fab line electrical design and commissioning. Switchgear and HV distribution experience preferred.', createdAt: ago(4) },
  { id: 'j10', title: 'Full Stack Developer', companyId: 'co8', location: 'Singapore', type: 'Permanent', salaryMin: 78000, salaryMax: 105000, skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], status: 'On Hold', priority: 'Low', fee: 18, openings: 1, ownerId: 'u3', description: 'Warehouse automation dashboard team. On hold pending budget approval.', createdAt: ago(25) },
];

// Applications: distribute candidates across job pipelines
const APPLICATIONS = [
  ['a1', 'j1', 'c1', 'Interview', 20], ['a2', 'j1', 'c6', 'Submitted', 15], ['a3', 'j1', 'c19', 'Screened', 9], ['a4', 'j1', 'c30', 'Sourced', 3],
  ['a5', 'j2', 'c2', 'Offer', 16], ['a6', 'j2', 'c12', 'Interview', 12], ['a7', 'j2', 'c16', 'Screened', 6], ['a8', 'j2', 'c27', 'Sourced', 2],
  ['a9', 'j3', 'c3', 'Interview', 10], ['a10', 'j3', 'c17', 'Submitted', 8], ['a11', 'j3', 'c31', 'Screened', 5], ['a12', 'j3', 'c24', 'Sourced', 1],
  ['a13', 'j4', 'c4', 'Submitted', 9], ['a14', 'j4', 'c12', 'Screened', 4],
  ['a15', 'j5', 'c6', 'Interview', 7], ['a16', 'j5', 'c1', 'Screened', 4],
  ['a17', 'j6', 'c11', 'Submitted', 6], ['a18', 'j6', 'c15', 'Screened', 3], ['a19', 'j6', 'c35', 'Sourced', 1],
  ['a20', 'j7', 'c5', 'Offer', 5], ['a21', 'j7', 'c25', 'Screened', 2],
  ['a22', 'j8', 'c10', 'Interview', 4], ['a23', 'j8', 'c17', 'Sourced', 1], ['a24', 'j8', 'c37', 'Screened', 2],
  ['a25', 'j9', 'c8', 'Submitted', 3], ['a26', 'j9', 'c20', 'Sourced', 1],
  ['a27', 'j10', 'c7', 'Screened', 20],
].map(([id, jobId, candidateId, stage, d]) => ({ id, jobId, candidateId, stage, addedAt: ago(d), stageChangedAt: ago(Math.max(0, d - 2)) }));

const DEALS = [
  { id: 'd1', name: 'Vertex DC — Johor campus ramp', companyId: 'co2', contactId: 'ct3', value: 180000, stage: 'Proposal', ownerId: 'u3', nextStep: 'Send revised terms by Friday', createdAt: ago(30), probability: 70 },
  { id: 'd2', name: 'Meridian — Oncology wing (6 nurses)', companyId: 'co5', contactId: 'ct6', value: 82000, stage: 'Won', ownerId: 'u2', nextStep: 'Kick-off intake call', createdAt: ago(28), probability: 100 },
  { id: 'd3', name: 'Aurora Robotics — ML team build-out', companyId: 'co4', contactId: 'ct7', value: 140000, stage: 'Meeting', ownerId: 'u3', nextStep: 'Demo shortlist Thursday', createdAt: ago(20), probability: 50 },
  { id: 'd4', name: 'Kite Financial — platform team', companyId: 'co3', contactId: 'ct5', value: 60000, stage: 'Contacted', ownerId: 'u1', nextStep: 'Follow up after CTO settles in', createdAt: ago(15), probability: 25 },
  { id: 'd5', name: 'Cobalt Semi — fab expansion RPO', companyId: 'co9', contactId: 'ct12', value: 250000, stage: 'Meeting', ownerId: 'u2', nextStep: 'Scope 300-headcount plan', createdAt: ago(12), probability: 45 },
  { id: 'd6', name: 'Harbourline — automation squad', companyId: 'co8', contactId: 'ct11', value: 55000, stage: 'Lead', ownerId: 'u3', nextStep: 'Research org structure', createdAt: ago(9), probability: 10 },
  { id: 'd7', name: 'Willow & Sage — clinic staffing', companyId: 'co10', contactId: 'ct13', value: 48000, stage: 'Proposal', ownerId: 'u2', nextStep: 'Pricing sign-off', createdAt: ago(6), probability: 65 },
  { id: 'd8', name: 'Lumen Analytics — data hires', companyId: 'co7', contactId: 'ct10', value: 36000, stage: 'Won', ownerId: 'u1', nextStep: 'Invoice deposit', createdAt: ago(18), probability: 100 },
  { id: 'd9', name: 'PolarGrid — grid programme staffing', companyId: 'co6', contactId: 'ct9', value: 95000, stage: 'Lost', ownerId: 'u3', nextStep: '—', createdAt: ago(35), probability: 0, lostReason: 'Went with incumbent vendor' },
];

const SEQUENCES = [
  {
    id: 's1', name: 'Candidate outreach — Data Centre ops', audience: 'Candidates', active: true, ownerId: 'u1',
    steps: [
      { channel: 'email', delayDays: 0, subject: 'Quick question about your DC ops experience', body: 'Hi {{first_name}},\n\nI came across your profile and your experience with {{top_skill}} stood out. I am working on a senior data centre role in Singapore that pays above your current band.\n\nOpen to a 15-minute call this week?\n\n{{sender_name}}' },
      { channel: 'linkedin', delayDays: 2, subject: '', body: 'Connection request: Hi {{first_name}}, recruiting for a hyperscale DC campus — your background fits. Keen to connect.' },
      { channel: 'email', delayDays: 4, subject: 'Re: Quick question', body: 'Hi {{first_name}}, floating this back up. The role closes shortlisting Friday — happy to share the spec either way.' },
      { channel: 'call', delayDays: 7, subject: '', body: 'Call task: reference the two emails, keep under 10 minutes, goal = book screening slot.' },
    ],
    enrollments: [
      { targetType: 'candidate', targetId: 'c1', currentStep: 3, status: 'Replied' },
      { targetType: 'candidate', targetId: 'c6', currentStep: 2, status: 'Active' },
      { targetType: 'candidate', targetId: 'c19', currentStep: 1, status: 'Active' },
      { targetType: 'candidate', targetId: 'c30', currentStep: 4, status: 'Completed' },
    ],
    stats: { sent: 41, opened: 28, replied: 9, bounced: 1 },
  },
  {
    id: 's2', name: 'BD — hiring-signal companies', audience: 'Clients', active: true, ownerId: 'u3',
    steps: [
      { channel: 'email', delayDays: 0, subject: 'Saw the news about {{company}}', body: 'Hi {{first_name}},\n\nSaw {{company}} is expanding. Teams in that position usually hit the same wall: the roles that matter most take the longest to fill.\n\nWe run a shortlist-in-14-days model. Worth a look?\n\n{{sender_name}}' },
      { channel: 'linkedin', delayDays: 3, subject: '', body: 'Hi {{first_name}}, sent you a note about the expansion — keen to share how we handled a similar ramp for another operator.' },
      { channel: 'email', delayDays: 6, subject: 'One case study', body: 'Hi {{first_name}}, one-pager attached: how a comparable team filled 6 critical roles in 5 weeks. If timing is wrong, say the word and I will close the loop.' },
    ],
    enrollments: [
      { targetType: 'contact', targetId: 'ct3', currentStep: 3, status: 'Replied' },
      { targetType: 'contact', targetId: 'ct12', currentStep: 2, status: 'Active' },
      { targetType: 'contact', targetId: 'ct9', currentStep: 3, status: 'No reply' },
    ],
    stats: { sent: 23, opened: 17, replied: 5, bounced: 0 },
  },
  {
    id: 's3', name: 'Nurse pipeline — warm re-engage', audience: 'Candidates', active: false, ownerId: 'u2',
    steps: [
      { channel: 'email', delayDays: 0, subject: 'New oncology wing — 6 senior roles', body: 'Hi {{first_name}}, the wing we discussed is confirmed. Six senior positions, leadership pathway included. Shall I put you forward?' },
      { channel: 'call', delayDays: 3, subject: '', body: 'Call task: confirm interest and notice period.' },
    ],
    enrollments: [
      { targetType: 'candidate', targetId: 'c3', currentStep: 2, status: 'Replied' },
      { targetType: 'candidate', targetId: 'c10', currentStep: 1, status: 'Paused' },
    ],
    stats: { sent: 12, opened: 10, replied: 6, bounced: 0 },
  },
];

const RECIPES = [
  { id: 'r1', name: 'New candidate → welcome + owner task', active: true, trigger: 'Candidate created', conditions: ['Source is not "Headhunted"'], actions: ['Send "Welcome" email template', 'Create task "Screen new candidate" for owner (due +2 days)'], runs: 34, lastRun: ago(1) },
  { id: 'r2', name: 'Stage → Submitted: notify client', active: true, trigger: 'Application stage changed to Submitted', conditions: ['Job status is Open'], actions: ['Email primary client contact with CV pack', 'Log activity on job', 'Create follow-up task (due +3 days)'], runs: 21, lastRun: ago(2) },
  { id: 'r3', name: 'Offer stage: prep placement record', active: true, trigger: 'Application stage changed to Offer', conditions: [], actions: ['Create draft placement', 'Notify BD owner', 'Create task "Verify fee terms"'], runs: 6, lastRun: ago(4) },
  { id: 'r4', name: 'Deal idle 14 days → nudge owner', active: false, trigger: 'Deal has no activity for 14 days', conditions: ['Stage is not Won/Lost'], actions: ['Create task "Re-engage deal" for owner', 'Add deal to review list'], runs: 11, lastRun: ago(9) },
  { id: 'r5', name: 'Market match ≥ 80 → auto-shortlist', active: true, trigger: 'Market Match run finds score ≥ 80', conditions: ['Candidate status is Active'], actions: ['Tag candidate "market-hot"', 'Create task "Review market match"', 'Draft outreach email'], runs: 17, lastRun: ago(0) },
];

const TASKS = [
  { id: 't1', title: 'Screen new candidate — Wei Jie Lim', due: ago(-1), done: false, priority: 'High', relatedType: 'candidate', relatedId: 'c1', ownerId: 'u1' },
  { id: 't2', title: 'Send revised Vertex proposal terms', due: ago(0), done: false, priority: 'Urgent', relatedType: 'deal', relatedId: 'd1', ownerId: 'u3' },
  { id: 't3', title: 'Prep interview pack — Ananya (ML Platform)', due: ago(0), done: false, priority: 'High', relatedType: 'job', relatedId: 'j2', ownerId: 'u2' },
  { id: 't4', title: 'Verify fee terms — Clinical Research offer', due: ago(-2), done: false, priority: 'Medium', relatedType: 'job', relatedId: 'j7', ownerId: 'u2' },
  { id: 't5', title: 'Call Rajesh re: Johor CFM role', due: ago(-1), done: false, priority: 'High', relatedType: 'candidate', relatedId: 'c6', ownerId: 'u1' },
  { id: 't6', title: 'Invoice deposit — Lumen Analytics', due: ago(1), done: true, priority: 'Medium', relatedType: 'deal', relatedId: 'd8', ownerId: 'u1' },
  { id: 't7', title: 'Scope Cobalt 300-headcount plan', due: ago(-3), done: false, priority: 'Medium', relatedType: 'deal', relatedId: 'd5', ownerId: 'u2' },
  { id: 't8', title: 'Review market match — 3 new ≥80 scores', due: ago(0), done: false, priority: 'High', relatedType: 'market', relatedId: '', ownerId: 'u1' },
  { id: 't9', title: 'Reference checks — Sarah Koh', due: ago(-2), done: false, priority: 'Medium', relatedType: 'candidate', relatedId: 'c3', ownerId: 'u2' },
  { id: 't10', title: 'Re-engage Kite Financial after CTO onboards', due: ago(-7), done: false, priority: 'Low', relatedType: 'deal', relatedId: 'd4', ownerId: 'u3' },
  { id: 't11', title: 'Update ICU JD with shift allowance details', due: ago(1), done: true, priority: 'Low', relatedType: 'job', relatedId: 'j8', ownerId: 'u2' },
  { id: 't12', title: 'Weekly pipeline review', due: ago(-4), done: false, priority: 'Medium', relatedType: '', relatedId: '', ownerId: 'u1' },
];

const PLACEMENTS = [
  { id: 'p1', candidateId: 'c13', jobTitle: 'Cloud Architect', companyId: 'co3', fee: 32000, startDate: ago(40), ownerId: 'u1' },
  { id: 'p2', candidateId: 'c14', jobTitle: 'Staff Nurse', companyId: 'co5', fee: 11000, startDate: ago(35), ownerId: 'u2' },
  { id: 'p3', candidateId: 'c18', jobTitle: 'Backend Engineer', companyId: 'co7', fee: 18000, startDate: ago(28), ownerId: 'u1' },
  { id: 'p4', candidateId: 'c21', jobTitle: 'Data Centre Technician', companyId: 'co2', fee: 9500, startDate: ago(22), ownerId: 'u1' },
  { id: 'p5', candidateId: 'c22', jobTitle: 'Nurse Manager', companyId: 'co10', fee: 15000, startDate: ago(15), ownerId: 'u2' },
  { id: 'p6', candidateId: 'c26', jobTitle: 'Data Scientist', companyId: 'co4', fee: 24000, startDate: ago(8), ownerId: 'u3' },
];

const ACTIVITIES = [
  { type: 'stage_change', text: 'Moved Ananya Sharma to Offer — ML Platform Engineer', relatedType: 'job', relatedId: 'j2', userId: 'u2', d: 0 },
  { type: 'email', text: 'Sent CV pack to Melissa Chua (Vertex) — 2 candidates for Senior DC Engineer', relatedType: 'job', relatedId: 'j1', userId: 'u1', d: 0 },
  { type: 'note', text: 'Rajesh open to Johor if housing allowance included. Wants 135k base minimum.', relatedType: 'candidate', relatedId: 'c6', userId: 'u1', d: 1 },
  { type: 'call', text: 'Intake call with Dr. Ravi Menon — ICU expansion confirmed at 4 heads', relatedType: 'contact', relatedId: 'ct6', userId: 'u2', d: 1 },
  { type: 'system', text: 'Recipe "Market match ≥ 80 → auto-shortlist" tagged 3 candidates', relatedType: 'market', relatedId: '', userId: 'u1', d: 1 },
  { type: 'email', text: 'Sofia Alvarez replied — wants shortlist demo Thursday', relatedType: 'deal', relatedId: 'd3', userId: 'u3', d: 2 },
  { type: 'stage_change', text: 'Moved Mei Ling Tan to Offer — Clinical Research Coordinator', relatedType: 'job', relatedId: 'j7', userId: 'u2', d: 2 },
  { type: 'note', text: 'Kite Financial budget unfreeze expected next month per Grace', relatedType: 'deal', relatedId: 'd4', userId: 'u1', d: 3 },
  { type: 'call', text: 'Screened Benjamin Chew — strong ICU fit, notice 1 month', relatedType: 'candidate', relatedId: 'c10', userId: 'u2', d: 3 },
  { type: 'system', text: 'Sequence "BD — hiring-signal companies": Vikram Pillai opened step 2', relatedType: 'contact', relatedId: 'ct12', userId: 'u3', d: 4 },
  { type: 'placement', text: 'Placement confirmed: Data Scientist at Aurora Robotics — fee S$24,000', relatedType: 'placement', relatedId: 'p6', userId: 'u3', d: 8 },
].map((a, i) => ({ id: 'act' + (i + 1), ts: ago(a.d), ...a }));

const EMAIL_TEMPLATES = [
  { id: 'et1', name: 'Welcome — new candidate', subject: 'Great to connect, {{first_name}}', body: 'Hi {{first_name}},\n\nThanks for registering with us. I have logged your profile and will flag roles matching your background in {{top_skill}}.\n\nBest,\n{{sender_name}}' },
  { id: 'et2', name: 'CV submission — client', subject: 'Shortlist: {{job_title}}', body: 'Hi {{first_name}},\n\nPlease find attached the shortlist for {{job_title}}. Each profile includes our screening notes and salary expectations.\n\nAvailable for a walkthrough call this week.\n\n{{sender_name}}' },
  { id: 'et3', name: 'Interview confirmation', subject: 'Interview confirmed — {{job_title}}', body: 'Hi {{first_name}},\n\nYour interview for {{job_title}} is confirmed. I will send preparation notes the day before.\n\n{{sender_name}}' },
];

module.exports = {
  users: USERS,
  companies: COMPANIES,
  contacts: CONTACTS,
  candidates: CANDIDATES,
  jobs: JOBS,
  applications: APPLICATIONS,
  deals: DEALS,
  sequences: SEQUENCES,
  recipes: RECIPES,
  tasks: TASKS,
  placements: PLACEMENTS,
  activities: ACTIVITIES,
  emailTemplates: EMAIL_TEMPLATES,
  settings: {
    stages: STAGES,
    dealStages: ['Lead', 'Contacted', 'Meeting', 'Proposal', 'Won', 'Lost'],
    currency: 'SGD',
    anthropicApiKey: '',
    aiModel: 'claude-sonnet-5',
    adzunaAppId: '',
    adzunaAppKey: '',
    jsearchKey: '',
    currentUserId: 'u1',
  },
  marketJobs: [],
  marketMatches: [],
};
