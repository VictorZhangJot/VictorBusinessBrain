// Rule-based ATS score (0–100) with strengths, improvements and missing keywords.

export function scoreResume(resume, role) {
  const checks = [];
  const add = (earned, max, pass, strength, improvement) =>
    checks.push({ earned, max, pass, strength, improvement });

  const { setup, personal, summary, experiences, skills, education } = resume;

  // 1. Clear job title (10)
  const hasTitle = !!(setup.targetTitle || "").trim();
  add(hasTitle ? 10 : 0, 10, hasTitle, "Clear target job title", "Add a target job title so recruiters know what you are applying for");

  // 2. Professional summary (15)
  const sumLen = (summary || "").trim().length;
  const goodSummary = sumLen >= 120 && sumLen <= 700;
  add(goodSummary ? 15 : sumLen > 0 ? 8 : 0, 15, goodSummary, "Strong career summary", sumLen === 0 ? "Add a career summary — it is the first thing recruiters read" : "Adjust your summary to 2–4 sentences for easy scanning");

  // 3. Contact details (10)
  const contactCount = [personal.name, personal.email, personal.phone].filter((v) => (v || "").trim()).length;
  add(Math.round((contactCount / 3) * 10), 10, contactCount === 3, "Complete contact details", "Fill in your name, email and phone number");

  // 4. Work experience completeness (20)
  const jobs = experiences.filter((e) => (e.company || "").trim() || (e.title || "").trim());
  const jobsWithBullets = jobs.filter((e) => (e.bullets || []).length >= 2);
  let expScore = 0;
  if (jobs.length >= 1) expScore += 8;
  if (jobsWithBullets.length >= 1) expScore += 6;
  if (jobsWithBullets.length === jobs.length && jobs.length > 0) expScore += 6;
  add(expScore, 20, expScore >= 14, "Work experience with detailed bullet points", jobs.length === 0 ? "Add at least one work experience entry" : "Give every job at least 2–3 bullet points");

  // 5. Skills relevance (15)
  const skillCount = (skills || []).length;
  const roleSkills = role ? role.skills.map((s) => s.toLowerCase()) : [];
  const relevant = (skills || []).filter((s) => roleSkills.some((rs) => rs.includes(s.toLowerCase()) || s.toLowerCase().includes(rs))).length;
  const skillScore = Math.min(15, skillCount === 0 ? 0 : 5 + Math.min(10, relevant * 2));
  add(skillScore, 15, skillScore >= 11, "Relevant skills for your target role", skillCount === 0 ? "Add skills — aim for 8–12 relevant ones" : "Add more skills that match your target role");

  // 6. Measurable achievements (10)
  const allBullets = experiences.flatMap((e) => e.bullets || []);
  const measured = allBullets.filter((b) => /\d/.test(b)).length;
  const measScore = measured >= 2 ? 10 : measured === 1 ? 6 : 0;
  add(measScore, 10, measScore >= 6, "Bullet points with measurable results", "Add rough numbers where you honestly can — %, team size, project count");

  // 7. Resume length (10)
  const words = countWords(resume);
  const goodLength = words >= 200 && words <= 800;
  add(goodLength ? 10 : words > 0 ? 5 : 0, 10, goodLength, "Good resume length for a 1–2 page CV", words < 200 ? "Your resume is on the thin side — add more detail to your roles" : "Your resume is long — trim older roles to keep it scannable");

  // 8. Keyword match (10)
  let missingKeywords = [];
  let kwScore = 0;
  if (role) {
    const text = fullText(resume).toLowerCase();
    const found = role.atsKeywords.filter((k) => text.includes(k));
    missingKeywords = role.atsKeywords.filter((k) => !text.includes(k));
    kwScore = Math.round((found.length / role.atsKeywords.length) * 10);
  }
  add(kwScore, 10, kwScore >= 7, "Good keyword match with your target role", "Work the missing keywords below into your bullets and skills — only where true");

  // Education presence is folded into length/completeness; light bonus check:
  const hasEdu = (education || []).some((e) => (e.institution || "").trim());

  const total = Math.min(100, checks.reduce((s, c) => s + c.earned, 0) + (hasEdu ? 0 : 0));
  return {
    score: total,
    strengths: checks.filter((c) => c.pass).map((c) => c.strength),
    improvements: checks.filter((c) => !c.pass).map((c) => c.improvement),
    missingKeywords,
  };
}

export function countWords(resume) {
  return fullText(resume).split(/\s+/).filter(Boolean).length;
}

function fullText(resume) {
  const { summary, experiences, skills, education, certifications, personal, setup } = resume;
  return [
    setup.targetTitle,
    summary,
    ...(skills || []),
    ...experiences.flatMap((e) => [e.company, e.title, ...(e.bullets || [])]),
    ...(education || []).flatMap((e) => [e.institution, e.qualification]),
    ...(certifications || []),
    personal.location,
  ]
    .filter(Boolean)
    .join(" ");
}
