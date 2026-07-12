import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SG Commercial Property Analyser",
  description:
    "Research Singapore commercial properties: sale and rental history, vicinity analysis and investment modelling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <header className="no-print sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-600 text-[13px] font-bold text-white">
                SG
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-ink-900">
                Commercial Property Analyser
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">
                Search
              </Link>
              <Link href="/import" className="rounded-lg px-3 py-1.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">
                Import data
              </Link>
              <Link href="/sources" className="rounded-lg px-3 py-1.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">
                Sources
              </Link>
              <Link href="/account" className="rounded-lg px-3 py-1.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">
                Account
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="no-print mx-auto max-w-7xl px-4 pb-10 sm:px-6">
          <div className="border-t border-ink-200/70 pt-6 text-xs leading-relaxed text-ink-500">
            <p className="font-medium text-ink-600">Important notices</p>
            <p className="mt-1">
              This application is for information and preliminary analysis only. It is not a formal property
              valuation and not financial, legal, tax or investment advice. Transaction records may not represent
              every completed transaction; rental information may be aggregated or estimated. Master Plan zoning
              does not guarantee that a project will proceed. Long-term projections are highly sensitive to
              assumptions. Verify title, tenure and property details through authorised professional and
              government sources, and consult qualified property, valuation, legal, financing and tax
              professionals before making any transaction.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
