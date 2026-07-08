// The live resume sheet. This is also exactly what gets printed to PDF.

function SectionTitle({ children }) {
  return (
    <h3 className="mb-2 mt-5 border-b border-mist-200 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-800">
      {children}
    </h3>
  );
}

export default function ResumePreview({ resume }) {
  const { personal, setup, summary, skills, experiences, education, certifications } = resume;
  const jobs = experiences.filter((e) => (e.company || e.title || "").trim());
  const edu = education.filter((e) => (e.institution || e.qualification || "").trim());
  const contact = [personal.email, personal.phone, personal.location, personal.linkedin, personal.portfolio].filter(Boolean);
  const isEmpty = !personal.name && !summary && jobs.length === 0 && skills.length === 0;

  return (
    <div
      id="resume-sheet"
      className="rounded-xl border border-mist-200 bg-white p-8 shadow-[0_2px_12px_rgba(10,27,51,0.07)] sm:p-10"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {isEmpty ? (
        <div className="py-16 text-center">
          <p className="text-3xl">📝</p>
          <p className="mt-3 text-sm font-semibold text-navy-800/60">Your resume builds here as you go</p>
          <p className="mt-1 text-[13px] text-navy-800/40">Start with Setup on the left — each click adds to this preview.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-navy-900">
            {personal.name || "Your Name"}
          </h1>
          {setup.targetTitle && <p className="mt-0.5 text-[13px] font-semibold text-accent-600">{setup.targetTitle}</p>}
          {contact.length > 0 && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-navy-800/60">{contact.join("  ·  ")}</p>
          )}

          {/* Career summary */}
          {summary && (
            <>
              <SectionTitle>Career Summary</SectionTitle>
              <p className="text-[12.5px] leading-relaxed text-navy-900/90">{summary}</p>
            </>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <>
              <SectionTitle>Key Skills</SectionTitle>
              <p className="text-[12.5px] leading-relaxed text-navy-900/90">{skills.join("  ·  ")}</p>
            </>
          )}

          {/* Experience */}
          {jobs.length > 0 && (
            <>
              <SectionTitle>Work Experience</SectionTitle>
              <div className="space-y-4">
                {jobs.map((job, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-bold text-navy-900">
                        {job.title || "Role"}
                        {job.company ? <span className="font-semibold text-navy-800/70"> — {job.company}</span> : ""}
                      </p>
                      <p className="shrink-0 text-[11px] font-medium text-navy-800/50">
                        {job.start}
                        {job.start || job.end || job.current ? " – " : ""}
                        {job.current ? "Present" : job.end}
                      </p>
                    </div>
                    {(job.bullets || []).length > 0 && (
                      <ul className="mt-1.5 space-y-1 pl-4">
                        {job.bullets.map((b, j) => (
                          <li key={j} className="list-disc text-[12.5px] leading-relaxed text-navy-900/90 marker:text-accent-600">
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Education */}
          {edu.length > 0 && (
            <>
              <SectionTitle>Education</SectionTitle>
              <div className="space-y-1.5">
                {edu.map((e, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] text-navy-900/90">
                      <span className="font-bold">{e.qualification || "Qualification"}</span>
                      {e.institution ? ` — ${e.institution}` : ""}
                    </p>
                    {e.year && <p className="shrink-0 text-[11px] font-medium text-navy-800/50">{e.year}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <>
              <SectionTitle>Certifications</SectionTitle>
              <ul className="space-y-1 pl-4">
                {certifications.map((c, i) => (
                  <li key={i} className="list-disc text-[12.5px] leading-relaxed text-navy-900/90 marker:text-accent-600">
                    {c}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
