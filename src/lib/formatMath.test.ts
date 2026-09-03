import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMathAndMarkdown } from "./formatMath.js";

test("formatMathAndMarkdown unescapes LaTeX percent signs", () => {
  assert.equal(formatMathAndMarkdown("Runs in 99\\% less time"), "Runs in 99% less time");
  assert.equal(formatMathAndMarkdown("a \\% b"), "a % b");
});

test("formatMathAndMarkdown normalizes LaTeX font wrappers and Big-O notation", () => {
  assert.equal(formatMathAndMarkdown("$\\mathcal{O}(N \\log N)$"), "O(N log N)");
  assert.equal(formatMathAndMarkdown("Time: $\\mathcal{O}(N^2)$"), "Time: O(N^2)");
  assert.equal(formatMathAndMarkdown("$\\mathbb{R}$"), "R");
});

test("formatMathAndMarkdown converts common LaTeX math symbols to clean Unicode", () => {
  assert.equal(formatMathAndMarkdown("0 \\le i \\le n"), "0 ≤ i ≤ n");
  assert.equal(formatMathAndMarkdown("x \\ge 0"), "x ≥ 0");
  assert.equal(formatMathAndMarkdown("a \\neq b"), "a ≠ b");
  assert.equal(formatMathAndMarkdown("n \\times m"), "n × m");
  assert.equal(formatMathAndMarkdown("k \\cdot n"), "k · n");
  assert.equal(formatMathAndMarkdown("x \\approx 3.14"), "x ≈ 3.14");
  assert.equal(formatMathAndMarkdown("x \\in S"), "x ∈ S");
  assert.equal(formatMathAndMarkdown("\\Theta(n) and \\Omega(1)"), "Θ(n) and Ω(1)");
});

test("formatMathAndMarkdown converts fractions and square roots", () => {
  assert.equal(formatMathAndMarkdown("\\frac{n(n+1)}{2}"), "(n(n+1))/(2)");
  assert.equal(formatMathAndMarkdown("\\sqrt{n}"), "√(n)");
});

test("formatMathAndMarkdown handles display math and dollar signs cleanly", () => {
  const input = "$$T(n) = 2T(n/2) + O(n)$$";
  const output = formatMathAndMarkdown(input);
  assert.ok(output.includes("T(n) = 2T(n/2) + O(n)"));
  assert.ok(!output.includes("$$"));
});
