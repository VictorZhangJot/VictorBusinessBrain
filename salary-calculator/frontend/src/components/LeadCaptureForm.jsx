import { useState } from 'react';
import { submitLead } from '../services/api.js';

export default function LeadCaptureForm({ defaultTargetRole = '' }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', targetRole: defaultTargetRole, consent: false, resume: null,
  });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setMessage('Please fill in your name and email.'); return; }
    if (!form.consent) { setMessage('Please tick the consent box so we can contact you.'); return; }
    setStatus('sending');
    setMessage('');
    try {
      const res = await submitLead(form);
      setStatus('done');
      setMessage(res.message);
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.error || 'Could not submit right now — please try again.');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-2xl bg-green-50 p-6 text-center">
        <p className="text-lg font-bold text-green-700">✓ Request received</p>
        <p className="mt-1 text-sm text-green-600">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <input className="field-input" placeholder="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <input className="field-input" type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <input className="field-input" placeholder="Phone (optional)" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <input className="field-input" placeholder="Target role" value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)} />
      <label className="sm:col-span-2">
        <span className="field-label">Upload resume (optional, PDF or Word)</span>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-electric-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-electric hover:file:bg-blue-100"
          onChange={(e) => set('resume', e.target.files?.[0] || null)}
        />
      </label>
      <label className="flex items-start gap-2.5 text-xs text-slate-500 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set('consent', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-[#2563EB]"
        />
        <span>
          I agree that Jobs of Tomorrow may contact me about my salary review and relevant
          opportunities. My details will not be shared with employers without my permission.
        </span>
      </label>
      {message && <p className="text-sm text-amber-600 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Request Free Salary Review'}
        </button>
      </div>
    </form>
  );
}
