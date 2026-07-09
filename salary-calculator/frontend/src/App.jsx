import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import CalculatorPage from './pages/CalculatorPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

export default function App() {
  // Result + profile are kept here so /results survives client-side navigation.
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white">
              JOT
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-navy">Jobs of Tomorrow</span>
              <span className="block text-[11px] font-medium text-slate-400">
                Singapore Salary Calculator
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {location.pathname !== '/calculator' && (
              <Link to="/calculator" className="btn-primary !px-4 !py-2 text-xs">
                Calculate My Salary
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/calculator"
            element={<CalculatorPage onResult={(r, p) => { setResult(r); setProfile(p); }} />}
          />
          <Route path="/results" element={<ResultsPage result={result} profile={profile} />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Jobs of Tomorrow Pte Ltd · Singapore recruitment consultancy</p>
          <div className="flex gap-4">
            <Link to="/admin" className="hover:text-electric">Admin</Link>
            <span>Estimates are a guide, not a guaranteed salary outcome.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
