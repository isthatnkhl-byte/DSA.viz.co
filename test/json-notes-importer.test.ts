import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseNotesFromJson } from "../src/lib/notes/json-importer";

test("JSON Notes Importer: parses LeetCode visualization JSON", () => {
  const filePath = path.resolve(process.cwd(), "public/generated-visualizations/3sum.json");
  const rawJson = fs.readFileSync(filePath, "utf-8");

  const result = parseNotesFromJson(rawJson, "3sum.json");
  assert.equal(result.success, true);
  assert.equal(result.importedItems.length, 1);

  const item = result.importedItems[0];
  assert.equal(item.title, "3sum");
  assert.equal(item.sourceType, "VISUALIZER_TRACE");
  assert.ok(item.codeSnippet && item.codeSnippet.includes("threeSum"));
  assert.ok(item.invariantText && item.invariantText.length > 0);
  assert.ok(item.activePointers);
});

test("JSON Notes Importer: parses array of notes", () => {
  const sampleArray = [
    {
      title: "Binary Search Template",
      sourceType: "COMPILER_CODE",
      codeSnippet: "int binarySearch() {}",
      tags: ["BinarySearch", "Template"],
    },
    {
      title: "DFS Tree Traversal",
      sourceType: "VISUALIZER_TRACE",
      codeSnippet: "void dfs() {}",
      tags: ["Tree", "DFS"],
    },
  ];

  const result = parseNotesFromJson(JSON.stringify(sampleArray), "exported-notes.json");
  assert.equal(result.success, true);
  assert.equal(result.importedItems.length, 2);
  assert.equal(result.importedItems[0].title, "Binary Search Template");
  assert.equal(result.importedItems[1].title, "DFS Tree Traversal");
});

test("JSON Notes Importer: safely handles malformed JSON", () => {
  const malformed = "{ title: 'Incomplete";
  const result = parseNotesFromJson(malformed, "bad.json");
  assert.equal(result.success, false);
  assert.equal(result.importedItems.length, 0);
  assert.ok(result.errorMessage);
});
