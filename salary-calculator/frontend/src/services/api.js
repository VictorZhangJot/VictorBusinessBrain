import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const calculateSalary = (profile) =>
  api.post('/salary/calculate', profile).then((r) => r.data);

export const recommendJobs = (profile) =>
  api.post('/jobs/recommend', profile).then((r) => r.data.jobs);

export const recommendCompanies = (profile) =>
  api.post('/companies/recommend', profile).then((r) => r.data.companies);

export const getSources = () => api.get('/sources').then((r) => r.data);

export const uploadSalaryCsv = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/admin/upload-salary-csv', form).then((r) => r.data);
};

export const submitLead = ({ name, email, phone, targetRole, consent, resume }) => {
  const form = new FormData();
  form.append('name', name);
  form.append('email', email);
  form.append('phone', phone || '');
  form.append('targetRole', targetRole || '');
  form.append('consent', consent ? 'true' : 'false');
  if (resume) form.append('resume', resume);
  return api.post('/leads', form).then((r) => r.data);
};

export default api;
