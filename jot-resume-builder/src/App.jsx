import { useEffect, useState } from "react";
import LandingPage from "./components/LandingPage.jsx";
import Builder from "./components/Builder.jsx";

const STORAGE_KEY = "jot-resume-draft-v1";

export const EMPTY_RESUME = {
  setup: { targetTitle: "", roleId: "", industry: "", levelId: "", currentRole: "", qualification: "", styleId: "professional" },
  personal: { name: "", email: "", phone: "", linkedin: "", location: "Singapore", portfolio: "" },
  summary: "",
  strengths: [],
  experiences: [],
  skills: [],
  education: [{ institution: "", qualification: "", year: "" }],
  certifications: [],
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Merge over the empty shape so old drafts survive future field additions.
    return { ...EMPTY_RESUME, ...parsed, setup: { ...EMPTY_RESUME.setup, ...parsed.setup }, personal: { ...EMPTY_RESUME.personal, ...parsed.personal } };
  } catch {
    return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [resume, setResume] = useState(() => loadDraft() || EMPTY_RESUME);
  const [hasDraft] = useState(() => !!loadDraft());

  // Auto-save the draft on every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  const startFresh = () => {
    setResume(EMPTY_RESUME);
    setScreen("builder");
  };

  const resumeDraft = () => setScreen("builder");

  if (screen === "landing") {
    return <LandingPage onStart={startFresh} onResume={hasDraft ? resumeDraft : null} />;
  }
  return <Builder resume={resume} setResume={setResume} onExit={() => setScreen("landing")} />;
}
