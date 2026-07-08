# JOT AI Resume Builder

A candidate-facing resume builder for Jobs of Tomorrow (jot.com.sg). Candidates
click AI-generated suggestions instead of writing from scratch, get an ATS
score, and download a Singapore-ready resume as PDF or Word.

No sign-up, no backend — drafts save automatically in the candidate's browser.

## How to run it

1. Open a terminal in this folder (`jot-resume-builder`).
2. First time only: `npm install`
3. Then: `npm run dev`
4. Open http://localhost:4830 in your browser.

## Which files control the resume content

All the suggestion wording lives in two plain-English files — edit the text
between quotes, keep the quotes and commas:

- **`src/data/roles.js`** — the 10 role categories. Each role has its career
  summary templates, responsibility bullets (basic / stronger /
  achievement-focused), skills, certifications and ATS keywords.
- **`src/data/achievements.js`** — the yes/no achievement questions and the
  bullet templates they generate.

Other useful files:

- `src/lib/ats.js` — how the ATS score is calculated.
- `src/lib/improve.js` — the "Improve wording" rewrite rules and the
  Singapore employer checklist.
- `src/components/ResumePreview.jsx` — the resume layout itself.

## Connecting a real AI later

Today the suggestions come from templates (instant, free, and they never
invent facts). To upgrade to live AI:

1. Get a Claude API key from console.anthropic.com.
2. Add a small backend endpoint (needed to keep the key secret) that calls
   the Claude API — model `claude-sonnet-5` is a good fit.
3. Replace the template lookups in `src/data/roles.js` usage and the
   transform functions in `src/lib/improve.js` with calls to that endpoint.

The app was structured so only those two touch-points change — the screens
stay as they are.

## Recruiter review requests (lead capture)

When a candidate asks for a free recruiter review before downloading, the
request is stored in their browser (localStorage key `jot-review-requests`).
For version 1 there is no server, so nothing is sent to JOT yet. To receive
leads by email, connect the form in
`src/components/steps/ReviewStep.jsx` (the `submit` function) to a form
service such as Formspree or Tally, or to your own endpoint.

## Deploying to your website

The app builds to plain static files — any host works:

1. Run `npm run build` — this creates a `dist/` folder.
2. Upload the contents of `dist/` to your web host, or drag the folder into
   Netlify / Vercel / Cloudflare Pages (all have free tiers).
3. To put it on a subdomain like `resume.jot.com.sg`, point the subdomain at
   that host in your DNS settings.
