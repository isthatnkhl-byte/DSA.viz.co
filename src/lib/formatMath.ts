/**
 * Sanitizes and normalizes mathematical notation, LaTeX symbols, and escaped characters
 * produced by AI models so they render cleanly in standard UI Markdown.
 */
export function formatMathAndMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Unescape LaTeX percent signs (e.g. 10\% -> 10%, a \% b -> a % b)
  cleaned = cleaned.replace(/\\%/g, "%");

  // 2. Clean LaTeX math font wrappers: \mathcal{O}(N) -> O(N), \mathbb{R} -> R
  cleaned = cleaned.replace(/\\mathcal\{([A-Za-z])\}/g, "$1");
  cleaned = cleaned.replace(/\\mathbb\{([A-Za-z])\}/g, "$1");
  cleaned = cleaned.replace(/\\mathbf\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\operatorname\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\(?:log|ln|exp|max|min)\b/g, (m) => m.slice(1));


  // 3. Convert common LaTeX mathematical symbols into clean Unicode
  cleaned = cleaned.replace(/\\(?:leq|le)\b/g, "≤");
  cleaned = cleaned.replace(/\\(?:geq|ge)\b/g, "≥");
  cleaned = cleaned.replace(/\\(?:neq|ne)\b/g, "≠");
  cleaned = cleaned.replace(/\\approx\b/g, "≈");
  cleaned = cleaned.replace(/\\times\b/g, "×");
  cleaned = cleaned.replace(/\\cdot\b/g, "·");
  cleaned = cleaned.replace(/\\div\b/g, "÷");
  cleaned = cleaned.replace(/\\pm\b/g, "±");
  cleaned = cleaned.replace(/\\infty\b/g, "∞");
  cleaned = cleaned.replace(/\\Theta\b/g, "Θ");
  cleaned = cleaned.replace(/\\Omega\b/g, "Ω");
  cleaned = cleaned.replace(/\\sum\b/g, "∑");
  cleaned = cleaned.replace(/\\prod\b/g, "∏");
  cleaned = cleaned.replace(/\\in\b/g, "∈");
  cleaned = cleaned.replace(/\\notin\b/g, "∉");
  cleaned = cleaned.replace(/\\subset(?:eq)?\b/g, "⊆");
  cleaned = cleaned.replace(/\\leftarrow\b/g, "←");
  cleaned = cleaned.replace(/\\(?:rightarrow|to)\b/g, "→");
  cleaned = cleaned.replace(/\\leftrightarrow\b/g, "↔");
  cleaned = cleaned.replace(/\\pmod\{([^}]+)\}/g, "(mod $1)");
  cleaned = cleaned.replace(/\\bmod\b/g, "mod");

  // 4. Fractions & square roots
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // 5. Clean LaTeX display math delimiters $$...$$ and inline $...$
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => `\n> ${eq.trim()}\n`);
  cleaned = cleaned.replace(/\$([^\$\n]+?)\$/g, (_, eq) => eq.trim());

  return cleaned;
}
