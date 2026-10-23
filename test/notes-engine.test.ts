import { test } from "node:test";
import assert from "node:assert";
import { compileHandwrittenNotesHtml } from "../src/lib/notes/pdf-compiler";
import { NotesBagItem, PdfCompilationConfig } from "../src/lib/notes/types";

test("Notes PDF Compiler: enforces strict 2-3 items per page limit", () => {
  const items: NotesBagItem[] = [
    {
      id: "item_1",
      title: "Binary Search",
      sourceType: "VISUALIZER_TRACE",
      createdAt: Date.now(),
      tags: ["BinarySearch"],
      codeSnippet: "int low = 0, high = n - 1;",
    },
    {
      id: "item_2",
      title: "Two Sum",
      sourceType: "PROBLEM_SOLUTION",
      createdAt: Date.now(),
      tags: ["HashTable"],
      codeSnippet: "unordered_map<int, int> seen;",
    },
    {
      id: "item_3",
      title: "Kadane Algorithm",
      sourceType: "COMPILER_CODE",
      createdAt: Date.now(),
      tags: ["DP"],
      codeSnippet: "cur = max(x, cur + x);",
    },
    {
      id: "item_4",
      title: "Sliding Window",
      sourceType: "AI_LEARNING_MODULE",
      createdAt: Date.now(),
      tags: ["Window"],
      codeSnippet: "windowSum += nums[r];",
    },
    {
      id: "item_5",
      title: "Invert Binary Tree",
      sourceType: "SMARTBOARD_WHITEBOARD",
      createdAt: Date.now(),
      tags: ["Tree"],
      canvasSnapshotUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
  ];

  // Test with 2 items per page: 5 items => 3 pages (2, 2, 1)
  const result2PerPage = compileHandwrittenNotesHtml(items, {
    documentTitle: "DSA Technical Notes",
    itemsPerPage: 2,
  });

  assert.strictEqual(result2PerPage.totalPages, 3, "5 items with 2 per page should yield 3 pages");
  assert.ok(result2PerPage.html.includes("DSA Technical Notes"), "HTML should contain title");
  assert.ok(result2PerPage.html.includes("pdf-page"), "HTML should contain pdf-page sheets");
  assert.ok(result2PerPage.html.includes("data:image/png;base64"), "HTML should embed canvas snapshot");

  // Test with 3 items per page: 5 items => 2 pages (3, 2)
  const result3PerPage = compileHandwrittenNotesHtml(items, {
    documentTitle: "DSA Technical Notes",
    itemsPerPage: 3,
  });

  assert.strictEqual(result3PerPage.totalPages, 2, "5 items with 3 per page should yield 2 pages");

  // Test clamped bounds: passing 10 itemsPerPage should clamp to 3
  const clampedResult = compileHandwrittenNotesHtml(items, {
    documentTitle: "Clamped Test",
    itemsPerPage: 10,
  });
  assert.strictEqual(clampedResult.totalPages, 2, "itemsPerPage > 3 should clamp to 3 items per page");
});

test("Notes PDF Compiler: handles empty and single-item bag gracefully", () => {
  const emptyResult = compileHandwrittenNotesHtml([], {
    documentTitle: "Empty Cheatsheet",
    itemsPerPage: 2,
  });

  assert.strictEqual(emptyResult.totalPages, 1, "Empty notes bag should still produce 1 clean notebook page");
  assert.ok(emptyResult.html.includes("No items selected"), "Should show friendly empty state");

  const singleItem: NotesBagItem[] = [
    {
      id: "note_single",
      title: "Graph Dijkstra Proof",
      sourceType: "PROBLEM_SOLUTION",
      createdAt: Date.now(),
      tags: ["Dijkstra", "ShortestPath"],
      invariantText: "Distance d[u] is optimal and finalized when u is popped from min-priority queue.",
      userNotes: "Does not support negative edge weights!",
      aiTakeaway: "Greedy choice property holds because all edge weights >= 0.",
    },
  ];

  const singleResult = compileHandwrittenNotesHtml(singleItem, {
    documentTitle: "Dijkstra Notes",
    itemsPerPage: 2,
  });

  assert.strictEqual(singleResult.totalPages, 1, "Single note should yield 1 page");
  assert.ok(singleResult.html.includes("Graph Dijkstra Proof"));
  assert.ok(singleResult.html.includes("Does not support negative edge weights!"));
  assert.ok(singleResult.html.includes("Greedy choice property holds"));
});
