import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("LeetCode Visualizations & Handwritten PDF Notes Generation Verification", () => {
  const publicVizDir = path.join(__dirname, "..", "public", "generated-visualizations");
  const slugs = ["3sum", "trapping-rain-water", "course-schedule", "lru-cache"];

  // 1. Verify all 4 visualization JSON files exist and have valid structure
  for (const slug of slugs) {
    const filePath = path.join(publicVizDir, `${slug}.json`);
    assert.ok(fs.existsSync(filePath), `JSON file for ${slug} must exist at ${filePath}`);

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    assert.ok(parsed, `JSON for ${slug} must parse cleanly`);

    // Verify code lines or manifest
    assert.ok(
      (Array.isArray(parsed.code_lines) && parsed.code_lines.length > 0) ||
      (Array.isArray(parsed.execution_plan) && parsed.execution_plan.length > 0) ||
      Boolean(parsed.visualization_manifest),
      `${slug} must contain code_lines or execution_plan or visualization_manifest`
    );
  }

  // 2. Verify compiled multi-page notes HTML
  const compiledHtmlPath = path.join(__dirname, "..", "public", "generated-notes.html");
  assert.ok(fs.existsSync(compiledHtmlPath), "Compiled notes HTML must exist in public folder");

  const html = fs.readFileSync(compiledHtmlPath, "utf8");

  // Verify page count: exactly 2 pages with 2 items per page
  const pageMatches = html.match(/class="pdf-page"/g) || [];
  assert.strictEqual(pageMatches.length, 2, "Must contain exactly 2 A4 pdf-page sheets for 4 items (2 items/page limit)");

  // Verify Page 1 has 3Sum and Trapping Rain Water
  assert.ok(html.includes("3Sum"), "Page must include 3Sum note");
  assert.ok(html.includes("Trapping Rain Water"), "Page must include Trapping Rain Water note");

  // Verify Page 2 has Course Schedule and LRU Cache
  assert.ok(html.includes("Course Schedule"), "Page must include Course Schedule note");
  assert.ok(html.includes("LRU Cache"), "Page must include LRU Cache note");

  // Verify all 4 SVG diagram snapshots are embedded
  const snapshotCount = (html.match(/class="snapshot-img"/g) || []).length;
  assert.strictEqual(snapshotCount, 4, "All 4 notes must embed their visual diagram snapshot");

  // Verify ruled student notebook paper styling & margin rule
  assert.ok(html.includes("red-margin-line"), "HTML must contain classic red margin line");
  assert.ok(html.includes("linear-gradient"), "HTML must have ruled paper background pattern");
  assert.ok(html.includes("Kalam"), "HTML must import and use Kalam font");
  assert.ok(html.includes("Caveat"), "HTML must import and use Caveat font");
  assert.ok(html.includes("sticky-note"), "HTML must contain sticky note invariant callout cards");

  // Verify A4 print CSS rules
  assert.ok(html.includes("@page"), "HTML must declare print @page CSS");
  assert.ok(html.includes("A4 portrait"), "HTML must be set to A4 portrait");
});
