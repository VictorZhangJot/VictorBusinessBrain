// Achievement builder prompts and templates.
//
// Each category is a simple yes/no question. When the candidate ticks one,
// they see the suggested bullets below. If they type a rough number, the
// "withNumber" version is used with their figure — we never invent metrics.
// {n} is replaced by the candidate's number.

export const ACHIEVEMENT_CATEGORIES = [
  {
    id: "efficiency",
    question: "Did you improve efficiency or save time?",
    numberLabel: "Rough % time saved (optional)",
    numberUnit: "%",
    templates: [
      {
        withNumber: "Improved reporting efficiency by automating manual data processes, reducing preparation time by approximately {n}%.",
        withoutNumber: "Improved efficiency by streamlining and automating manual processes, reducing preparation time for the team.",
      },
      {
        withNumber: "Streamlined recurring workflows and removed duplicate steps, cutting turnaround time by around {n}%.",
        withoutNumber: "Streamlined recurring workflows and removed duplicate steps, shortening turnaround times.",
      },
    ],
  },
  {
    id: "cost",
    question: "Did you reduce cost or save money?",
    numberLabel: "Rough % or $ saved (optional)",
    numberUnit: "",
    templates: [
      {
        withNumber: "Identified and implemented cost-saving measures that reduced expenses by approximately {n}.",
        withoutNumber: "Identified and implemented cost-saving measures across vendors, tools and processes without compromising quality.",
      },
      {
        withNumber: "Reviewed vendor contracts and usage, achieving savings of around {n} while maintaining service levels.",
        withoutNumber: "Reviewed vendor contracts and resource usage, achieving measurable savings while maintaining service levels.",
      },
    ],
  },
  {
    id: "people",
    question: "Did you manage or train people?",
    numberLabel: "Team size (optional)",
    numberUnit: "people",
    templates: [
      {
        withNumber: "Led and developed a team of {n}, managing workload allocation, coaching and performance reviews.",
        withoutNumber: "Led and developed team members, managing workload allocation, coaching and performance reviews.",
      },
      {
        withNumber: "Trained and onboarded {n} new team members, shortening the time needed for them to work independently.",
        withoutNumber: "Trained and onboarded new team members, shortening the time needed for them to work independently.",
      },
    ],
  },
  {
    id: "customers",
    question: "Did you handle customers or end users?",
    numberLabel: "Rough number served (optional)",
    numberUnit: "",
    templates: [
      {
        withNumber: "Supported over {n} customers and end users, ensuring timely resolution of issues and consistent service quality.",
        withoutNumber: "Supported customers and end users across multiple departments, ensuring timely resolution of issues.",
      },
      {
        withNumber: "Managed relationships with {n} key accounts, maintaining high satisfaction and repeat business.",
        withoutNumber: "Managed key customer relationships, maintaining high satisfaction and repeat business.",
      },
    ],
  },
  {
    id: "revenue",
    question: "Did you improve revenue or sales?",
    numberLabel: "Rough % or $ growth (optional)",
    numberUnit: "",
    templates: [
      {
        withNumber: "Contributed to revenue growth of approximately {n} through new business and account expansion.",
        withoutNumber: "Contributed to revenue growth through new business development and expansion of existing accounts.",
      },
      {
        withNumber: "Exceeded sales targets, delivering around {n} above plan through disciplined pipeline management.",
        withoutNumber: "Met or exceeded sales targets through disciplined pipeline management and consistent follow-up.",
      },
    ],
  },
  {
    id: "projects",
    question: "Did you complete projects or rollouts?",
    numberLabel: "Number of projects (optional)",
    numberUnit: "",
    templates: [
      {
        withNumber: "Delivered {n} projects within planned timelines, coordinating vendors and internal stakeholders throughout.",
        withoutNumber: "Coordinated with vendors and internal stakeholders to complete projects within planned timelines.",
      },
      {
        withNumber: "Supported {n} system rollouts and migrations, planning cutovers to minimise disruption to daily operations.",
        withoutNumber: "Supported system rollouts and migrations, planning cutovers to minimise disruption to daily operations.",
      },
    ],
  },
  {
    id: "systems",
    question: "Did you work with systems, software or equipment?",
    numberLabel: "Uptime % or systems count (optional)",
    numberUnit: "",
    templates: [
      {
        withNumber: "Maintained and supported critical systems and equipment, sustaining availability of around {n}.",
        withoutNumber: "Maintained and supported critical systems and equipment, sustaining reliable day-to-day operations.",
      },
      {
        withNumber: "Administered {n} systems and tools, handling configuration, upgrades and user support.",
        withoutNumber: "Administered business systems and tools, handling configuration, upgrades and user support.",
      },
    ],
  },
];

export function buildAchievement(template, rawNumber) {
  const n = (rawNumber || "").trim();
  if (n) return template.withNumber.replace("{n}", n);
  return template.withoutNumber;
}
