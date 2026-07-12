"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, ErrorState, Field } from "@/components/ui";

export default function AccountPage() {
  const [user, setUser] = useState<{ email: string; displayName: string | null } | null>(null);
  const [watchlist, setWatchlist] = useState<{ id: string; name: string; address: string }[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const res = await fetch("/api/auth");
    const json = await res.json();
    setUser(json.user);
    setLoaded(true);
    if (json.user) {
      const wl = await fetch("/api/watchlist").then((r) => r.json());
      setWatchlist(wl.buildings ?? []);
    }
  }
  useEffect(() => {
    refresh().catch(() => setLoaded(true));
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setUser(null);
    setWatchlist([]);
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink-950">Account</h1>
      {user ? (
        <>
          <Card className="mb-4">
            <p className="text-sm text-ink-700">
              Signed in as <strong>{user.email}</strong>
            </p>
            <p className="mt-1 text-xs text-ink-500">Watchlists, saved scenarios and uploads are private to this account.</p>
            <button onClick={logout} className="btn-ghost mt-4 text-xs">Sign out</button>
          </Card>
          <Card title="Watchlist">
            {watchlist.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing watched yet - open a property and press “Watch”.</p>
            ) : (
              <ul className="divide-y divide-ink-50">
                {watchlist.map((b) => (
                  <li key={b.id} className="py-2">
                    <Link href={`/property/${b.id}`} className="text-sm font-medium text-accent-700 hover:underline">{b.name}</Link>
                    <p className="text-xs text-ink-500">{b.address}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <div className="mb-4 flex gap-1 rounded-lg bg-ink-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"}`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password" hint="At least 8 characters. Demo account: demo@local / demo1234">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
            {error && <ErrorState message={error} />}
            <button onClick={submit} disabled={busy} className="btn-primary">
              {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
