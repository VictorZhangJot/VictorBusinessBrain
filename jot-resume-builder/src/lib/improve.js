// AI improvement assistant — deterministic wording transforms.
// These are honest, rule-based rewrites: they never invent metrics or facts.
// Later, this file is the natural place to swap in a Claude/OpenAI API call.

const VERB_UPGRADES = [
  [/\bresponsible for managing\b/gi, "managed"],
  [/\bresponsible for\b/gi, "managed"],
  [/\bin charge of\b/gi, "led"],
  [/\bhelped with\b/gi, "supported"],
  [/\bhelped to\b/gi, "helped"],
  [/\bworked on\b/gi, "delivered"],
  [/\bdid\b/gi, "performed"],
  [/\bmade\b/gi, "produced"],
  [/\bgot\b/gi, "achieved"],
  [/\bdealt with\b/gi, "handled"],
  [/\btook care of\b/gi, "managed"],
];

const FILLER_CUTS = [
  [/\bin order to\b/gi, "to"],
  [/\bsuccessfully\s+/gi, ""],
  [/\beffectively\s+/gi, ""],
  [/\bvarious\s+/gi, ""],
  [/\ba wide range of\b/gi, "multiple"],
  [/\ba variety of\b/gi, "multiple"],
  [/\bon a daily basis\b/gi, "daily"],
  [/\bas well as\b/gi, "and"],
  [/\bat this point in time\b/gi, "now"],
  [/\butilized\b/gi, "used"],
  [/\butilised\b/gi, "used"],
  [/  +/g, " "],
];

const CASUAL_FIXES = [
  [/\bI\s+/g, ""],
  [/\bmy\s+/gi, "the "],
  [/\bcan't\b/gi, "cannot"],
  [/\bdon't\b/gi, "do not"],
  [/\bdidn't\b/gi, "did not"],
  [/\bwon't\b/gi, "will not"],
  [/\bit's\b/gi, "it is"],
  [/\bstuff\b/gi, "tasks"],
  [/\bthings\b/gi, "tasks"],
  [/\blots of\b/gi, "many"],
  [/\ba lot of\b/gi, "significant"],
];

function apply(text, rules) {
  let out = text;
  for (const [pattern, replacement] of rules) out = out.replace(pattern, replacement);
  out = out.trim();
  if (out) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

const IMPACT_TAILS = [
  "supporting smoother day-to-day operations",
  "improving reliability for the team",
  "contributing to consistent delivery for stakeholders",
];

export const IMPROVEMENTS = [
  {
    id: "wording",
    label: "Improve wording",
    hint: "Upgrades weak verbs like “responsible for” and “helped with”",
    fn: (t) => apply(t, VERB_UPGRADES),
  },
  {
    id: "professional",
    label: "Make it more professional",
    hint: "Removes casual phrasing and first-person wording",
    fn: (t) => apply(apply(t, CASUAL_FIXES), VERB_UPGRADES),
  },
  {
    id: "concise",
    label: "Make it more concise",
    hint: "Cuts filler words so recruiters can scan faster",
    fn: (t) => apply(t, FILLER_CUTS),
  },
  {
    id: "achievement",
    label: "Make it more achievement-focused",
    hint: "Adds a business-value ending where a bullet stops at the task",
    fn: (t) => {
      let out = apply(t, VERB_UPGRADES);
      const hasImpact = /(improv|reduc|increas|sav|support|enabl|deliver|achiev|grow|grew|cut|shorten|prevent|%|\d)/i.test(out);
      if (!hasImpact && out.length > 0) {
        out = out.replace(/\.?\s*$/, "");
        out += ", " + IMPACT_TAILS[out.length % IMPACT_TAILS.length] + ".";
      }
      return out;
    },
  },
];

// Singapore-employer checklist shown in the assistant (advice, not rewrites).
export const SG_TIPS = [
  "Keep it to 1–2 pages — Singapore recruiters scan fast.",
  "No photo, NRIC/FIN number, date of birth, or marital status needed.",
  "State your location and, if relevant, your work pass status (Citizen / PR / pass type).",
  "Use clear month-year dates (e.g. Mar 2022 – Present) with no unexplained gaps.",
  "List concrete tools and systems by name — ATS software matches exact keywords.",
  "Mention notice period or availability if you are actively looking.",
];
