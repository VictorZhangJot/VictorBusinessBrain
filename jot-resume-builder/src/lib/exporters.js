// Export helpers: plain text, Word file, and PDF (via the browser's print-to-PDF).

export function resumeToText(resume) {
  const { personal, setup, summary, skills, experiences, education, certifications } = resume;
  const lines = [];
  const push = (s = "") => lines.push(s);

  push((personal.name || "Your Name").toUpperCase());
  if (setup.targetTitle) push(setup.targetTitle);
  push(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.portfolio]
      .filter(Boolean)
      .join("  |  ")
  );
  push();

  if (summary) {
    push("CAREER SUMMARY");
    push(summary);
    push();
  }
  if ((skills || []).length) {
    push("KEY SKILLS");
    push(skills.join("  ·  "));
    push();
  }
  const jobs = experiences.filter((e) => (e.company || e.title || "").trim());
  if (jobs.length) {
    push("WORK EXPERIENCE");
    for (const job of jobs) {
      push(`${job.title || "Role"} — ${job.company || "Company"}`);
      push(`${job.start || ""}${job.start || job.end ? " – " : ""}${job.current ? "Present" : job.end || ""}`);
      for (const b of job.bullets || []) push(`• ${b}`);
      push();
    }
  }
  const edu = (education || []).filter((e) => (e.institution || e.qualification || "").trim());
  if (edu.length) {
    push("EDUCATION");
    for (const e of edu) push(`${e.qualification || ""} — ${e.institution || ""}${e.year ? ` (${e.year})` : ""}`);
    push();
  }
  if ((certifications || []).length) {
    push("CERTIFICATIONS");
    for (const c of certifications) push(`• ${c}`);
  }
  return lines.join("\n").trim();
}

// Downloads a Word-compatible .doc file (opens cleanly in Microsoft Word).
export function downloadDoc(resume) {
  const { personal, setup, summary, skills, experiences, education, certifications } = resume;
  const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const jobs = experiences.filter((e) => (e.company || e.title || "").trim());
  const edu = (education || []).filter((e) => (e.institution || e.qualification || "").trim());

  const html = `
<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
  h1 { font-size: 20pt; margin: 0; color: #0a1b33; }
  .title { font-size: 12pt; color: #2563eb; margin: 2pt 0 4pt; font-weight: bold; }
  .contact { font-size: 9.5pt; color: #444; margin-bottom: 12pt; }
  h2 { font-size: 11pt; color: #0a1b33; border-bottom: 1pt solid #cccccc; text-transform: uppercase; letter-spacing: 1pt; margin: 14pt 0 6pt; padding-bottom: 2pt; }
  .job-head { font-weight: bold; margin: 8pt 0 0; }
  .job-dates { color: #666; font-size: 9.5pt; margin: 0 0 4pt; }
  ul { margin: 2pt 0 8pt 18pt; padding: 0; }
  li { margin-bottom: 3pt; }
</style></head><body>
<h1>${esc(personal.name || "Your Name")}</h1>
${setup.targetTitle ? `<p class="title">${esc(setup.targetTitle)}</p>` : ""}
<p class="contact">${[personal.email, personal.phone, personal.location, personal.linkedin, personal.portfolio].filter(Boolean).map(esc).join(" &nbsp;|&nbsp; ")}</p>
${summary ? `<h2>Career Summary</h2><p>${esc(summary)}</p>` : ""}
${(skills || []).length ? `<h2>Key Skills</h2><p>${skills.map(esc).join(" &nbsp;·&nbsp; ")}</p>` : ""}
${jobs.length ? `<h2>Work Experience</h2>` + jobs.map((j) => `
  <p class="job-head">${esc(j.title || "Role")} — ${esc(j.company || "Company")}</p>
  <p class="job-dates">${esc(j.start || "")}${j.start || j.end ? " – " : ""}${j.current ? "Present" : esc(j.end || "")}</p>
  <ul>${(j.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`).join("") : ""}
${edu.length ? `<h2>Education</h2>` + edu.map((e) => `<p><b>${esc(e.qualification || "")}</b> — ${esc(e.institution || "")}${e.year ? ` (${esc(e.year)})` : ""}</p>`).join("") : ""}
${(certifications || []).length ? `<h2>Certifications</h2><ul>${certifications.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
</body></html>`;

  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(personal.name || "resume").replace(/\s+/g, "-")}-resume.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyResumeText(resume) {
  return navigator.clipboard.writeText(resumeToText(resume));
}

export function printResume() {
  window.print();
}
