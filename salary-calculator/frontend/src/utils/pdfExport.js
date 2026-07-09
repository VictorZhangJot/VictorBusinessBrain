import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const fmt = (n) => (n != null ? `S$${Math.round(n).toLocaleString()}` : '-');

/**
 * Builds the downloadable salary report. The bell curve is captured as an
 * image from the on-screen chart element (pass its DOM node as chartEl).
 */
export async function exportSalaryReport({ profile, salary, jobs, chartEl }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 0;

  const heading = (text) => {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(11, 31, 59);
    doc.text(text, margin, y);
    y += 7;
  };
  const body = (text, size = 10) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(60, 72, 88);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    lines.forEach((line) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    });
  };

  // Header band
  doc.setFillColor(11, 31, 59);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('JOT Singapore Salary Report', margin, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Jobs of Tomorrow · Generated ${new Date().toLocaleDateString('en-SG')}`, margin, 21);
  y = 42;

  heading('Candidate profile');
  body(
    `Current role: ${profile.currentTitle || '-'}   |   Target role: ${profile.targetTitle || '-'}\n` +
    `Experience: ${profile.yearsExperience} years   |   Qualification: ${profile.qualification || '-'}\n` +
    `Industry: ${profile.industry || '-'}   |   Specialization: ${profile.specialization || '-'}   |   Seniority: ${profile.seniority || '-'}\n` +
    `Current monthly salary: ${fmt(profile.currentMonthlySalary)}   |   Expected: ${fmt(profile.expectedMonthlySalary)}\n` +
    `Key skills: ${(profile.skills || []).join(', ') || '-'}`
  );
  y += 4;

  heading('Salary percentile benchmark (monthly, S$)');
  const rows = [
    ['25th percentile (Entry / Lower Market)', fmt(salary.p25)],
    ['50th percentile (Market Median)', fmt(salary.p50)],
    ['75th percentile (Competitive)', fmt(salary.p75)],
    ['90th percentile (Top Market)', fmt(salary.p90)],
    ['Top Market Range', fmt(salary.topMarket)],
    ['Recommended asking range', `${fmt(salary.recommendedMin)} - ${fmt(salary.recommendedMax)}`],
  ];
  rows.forEach(([label, value], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(246, 248, 251);
      doc.rect(margin - 2, y - 4.5, pageW - margin * 2 + 4, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 72, 88);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 31, 59);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 7;
  });
  if (salary.currentSalaryPercentile != null) {
    y += 2;
    body(`Your current salary sits at approximately the ${salary.currentSalaryPercentile}th percentile. Confidence score: ${salary.confidenceScore}/100.`);
  }
  y += 4;

  // Bell curve image
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, { backgroundColor: '#ffffff', scale: 2 });
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      if (y + imgH > 275) { doc.addPage(); y = 20; }
      heading('Market salary distribution');
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      // Chart capture is best-effort; the numbers above stand on their own.
    }
  }

  heading('What this means');
  (salary.interpretation || []).forEach((line) => body(`•  ${line}`));
  y += 4;

  if (jobs?.length) {
    heading('Matching opportunities');
    jobs.slice(0, 5).forEach((j) => {
      body(
        `${j.jobTitle} — ${j.company} (${j.matchScore}% match)\n` +
        `   ${fmt(j.salaryMin)} - ${fmt(j.salaryMax)}/mo · ${j.location} · ${j.workArrangement} · Source: ${j.source}`
      );
      y += 1;
    });
    y += 3;
  }

  if (salary.skillsGap?.length) {
    heading('Skills that could lift your salary potential');
    body(salary.skillsGap.map((s) => s.skill).join(', '));
    y += 4;
  }

  if (salary.dataSources?.length) {
    heading('Data sources');
    salary.dataSources.forEach((s) => {
      body(`•  ${s.source} (${s.sourceTypeLabel}, latest data ${s.sourceDate || 'n/a'}, ${s.recordsUsed} record(s) used)`);
    });
    y += 4;
  }

  heading('Disclaimer');
  body(salary.disclaimer || '', 8);

  doc.save('JOT-Singapore-Salary-Report.pdf');
}
