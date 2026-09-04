/**
 * Speech synthesis utilities for the Live Interview proctored system.
 * Handles text cleaning (phoneticizing Big-O notation, equations, stripping markdown)
 * and intelligent neural voice selection across different OS/browser environments.
 */

export type VoiceProfileId = "alex-male" | "sarah-female" | "david-british" | "system-natural";

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  role: string;
  avatar: string;
  tag: string;
  description: string;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "alex-male",
    name: "Alex",
    role: "Senior Tech Lead",
    avatar: "👨‍💻",
    tag: "US English • Natural",
    description: "Deep, conversational US tech lead tone. Great for calm, methodical feedback.",
  },
  {
    id: "sarah-female",
    name: "Sarah",
    role: "Principal Engineer",
    avatar: "👩‍💻",
    tag: "US English • Natural",
    description: "Clear, engaging US principal engineer tone. Crisp articulation on algorithmic trade-offs.",
  },
  {
    id: "david-british",
    name: "David",
    role: "Staff Architect",
    avatar: "👨‍💼",
    tag: "UK English • Natural",
    description: "Articulate British staff architect tone. Precise on invariants and edge cases.",
  },
  {
    id: "system-natural",
    name: "Auto Natural",
    role: "System Neural Voice",
    avatar: "🎙️",
    tag: "OS Highest Quality",
    description: "Automatically binds to the highest fidelity neural voice available on your browser.",
  },
];

/**
 * Phoneticizes technical math, Big-O notations, and code symbols,
 * and strips Markdown formatting so Web Speech synthesis sounds like a natural human speaking.
 */
export function cleanTextForHumanSpeech(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // 1. Phoneticize Big-O notations
  text = text
    .replace(/\bO\(\s*1\s*\)/gi, "O of 1")
    .replace(/\bO\(\s*log\s*n\s*\)/gi, "O of log N")
    .replace(/\bO\(\s*n\s*(\^2|²)\s*\)/gi, "O of N squared")
    .replace(/\bO\(\s*n\s*(\^3|³)\s*\)/gi, "O of N cubed")
    .replace(/\bO\(\s*2\s*(\^n|ⁿ)\s*\)/gi, "O of 2 to the N")
    .replace(/\bO\(\s*n\s*log\s*n\s*\)/gi, "O of N log N")
    .replace(/\bO\(\s*n\s*[*x×]\s*m\s*\)/gi, "O of N by M")
    .replace(/\bO\(\s*v\s*\+\s*e\s*\)/gi, "O of V plus E")
    .replace(/\bO\(\s*n\s*\)/gi, "O of N")
    .replace(/\bO\(([^)]+)\)/g, "O of $1");

  // 2. Mathematical exponents like N^2 -> N squared
  text = text
    .replace(/\b([Nn])(\^2|²)\b/g, "$1 squared")
    .replace(/\b([Nn])(\^3|³)\b/g, "$1 cubed")
    .replace(/\b2(\^([Nn])|ⁿ)\b/g, "2 to the $1");

  // 3. Code comparison operators & logic symbols to spoken English
  text = text
    .replace(/===?/g, " equals ")
    .replace(/!==?/g, " is not equal to ")
    .replace(/<=/g, " less than or equal to ")
    .replace(/>=/g, " greater than or equal to ")
    .replace(/&&/g, " and ")
    .replace(/\|\|/g, " or ");

  // 4. Remove markdown formatting
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^[-*•]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");

  // 5. Clean extra symbols, quotes, and whitespace
  text = text
    .replace(/["""]/g, '"')
    .replace(/[''']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Discovers and ranks the highest-quality human/neural voices matching the candidate's chosen profile.
 */
export function findBestVoice<T extends { name: string; lang: string }>(
  voices: T[],
  profile: VoiceProfileId
): T | null {
  if (!voices || voices.length === 0) return null;

  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = enVoices.length > 0 ? enVoices : voices;

  const isNatural = (v: T) =>
    v.name.includes("Natural") ||
    v.name.includes("Neural") ||
    v.name.includes("Online") ||
    v.name.includes("Enhanced") ||
    v.name.includes("Google");

  if (profile === "alex-male") {
    return (
      pool.find((v) => isNatural(v) && /guy|christopher|eric|andrew|alex|male|google us/i.test(v.name) && /en[-_]us/i.test(v.lang)) ||
      pool.find((v) => /guy|christopher|eric|andrew|alex|david|mark|george/i.test(v.name) && /en[-_]us/i.test(v.lang)) ||
      pool.find((v) => /male|guy|alex/i.test(v.name)) ||
      pool.find((v) => isNatural(v) && /en[-_]us/i.test(v.lang)) ||
      pool.find((v) => /en[-_]us/i.test(v.lang)) ||
      pool[0] ||
      null
    );
  }

  if (profile === "sarah-female") {
    return (
      pool.find((v) => isNatural(v) && /jenny|aria|samantha|zira|female|victoria|karen/i.test(v.name) && /en[-_]us/i.test(v.lang)) ||
      pool.find((v) => /jenny|aria|samantha|zira|female|victoria|karen/i.test(v.name)) ||
      pool.find((v) => isNatural(v) && !/guy|christopher|eric|alex|daniel|david|male/i.test(v.name) && /en[-_]us/i.test(v.lang)) ||
      pool.find((v) => /en[-_]us/i.test(v.lang)) ||
      pool[0] ||
      null
    );
  }

  if (profile === "david-british") {
    return (
      pool.find((v) => isNatural(v) && /ryan|oliver|daniel|george|british|uk/i.test(v.name) && /en[-_]gb/i.test(v.lang)) ||
      pool.find((v) => /ryan|oliver|daniel|george|british|uk/i.test(v.name)) ||
      pool.find((v) => /en[-_]gb/i.test(v.lang)) ||
      pool.find((v) => isNatural(v)) ||
      pool[0] ||
      null
    );
  }

  // System Natural Auto
  return (
    pool.find((v) => isNatural(v) && /en[-_]us/i.test(v.lang)) ||
    pool.find((v) => isNatural(v)) ||
    pool.find((v) => /en[-_]us/i.test(v.lang)) ||
    pool[0] ||
    null
  );
}
