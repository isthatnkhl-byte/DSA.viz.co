import test from "node:test";
import assert from "node:assert/strict";
import {
  hasMeaningfulTraversal,
  inferLineFromDesc,
  scoreLineKeywordOverlap,
  validateAndNormalizeVizPayload,
} from "./ai-contracts";
import { getProblemDatasets, localFallbackViz, pickShape, type VizStep, type TestDataset } from "./problems";
import { simulateProblem, simulateProblemWithDataset } from "./simulators";
import { coordKey } from "../components/visualizer/VisualizerTypes";

const fallback = {
  code: ["const x = 1;", "return x;"],
  array: [4, 2, 3],
  steps: [{ type: "array" as const, line: 0, desc: "fallback" }],
};

test("normalizes hashmap payloads without losing structure", () => {
  const result = validateAndNormalizeVizPayload(
    {
      code_lines: ["set map", "visit key"],
      test_array: [1, 2, 3],
      viz_steps: [{ type: "hashmap", line: 0, desc: "insert", map: { a: 1 }, visited: ["a"] }],
    },
    fallback,
    "hashmap",
  );

  const firstStep = result.viz_steps[0];
  assert.ok(firstStep);
  assert.equal(firstStep.type, "hashmap");
  assert.deepEqual(firstStep.map, { a: 1 });
  assert.deepEqual(result.test_array, [1, 2, 3]);
});

test("falls back to deterministic trace for malformed payloads", () => {
  const result = validateAndNormalizeVizPayload(
    {
      code_lines: [],
      test_array: [],
      viz_steps: [{ type: "bad", line: 99, desc: "" }],
    },
    fallback,
    "array",
  );

  const firstStep = result.viz_steps[0];
  assert.ok(firstStep);
  assert.equal(firstStep.type, "array");
  assert.equal(firstStep.desc, "Executing step.");
  assert.deepEqual(result.code_lines, fallback.code);
});

test("falls back to a safe matrix while preserving the graph type", () => {
  const result = validateAndNormalizeVizPayload(
    {
      code_lines: ["const path = [[1, 2], [3, 4]];"],
      test_array: [1, 2, 3],
      viz_steps: [{ type: "graph", line: 0, desc: "visit node", matrix: "[[1,2],[3,4]]" }],
    },
    fallback,
    "graph",
  );

  const firstStep = result.viz_steps[0];
  assert.ok(firstStep);
  assert.equal(firstStep.type, "graph");
  assert.deepEqual(firstStep.matrix, [[4, 2, 3]]);
  assert.equal(firstStep.desc, "visit node");
});

test("two-sum fallback chooses the hashmap trace instead of sliding-window logic", () => {
  assert.equal(pickShape("two-sum", ["Array", "Hash Table"]), "hashmap");
  const fallbackTrace = localFallbackViz("two-sum", ["Array", "Hash Table"]);
  assert.equal(fallbackTrace.steps[0]?.type, "hashmap");
  assert.ok(fallbackTrace.steps.some((step) => step.map && Object.keys(step.map).length > 0));
});

test("treats repeated static steps as non-meaningful traversal", () => {
  const steps: VizStep[] = [
    { type: "hashmap", line: 0, desc: "Same", map: { a: 1 }, visited: ["a"], current: 1 },
    { type: "hashmap", line: 0, desc: "Same", map: { a: 1 }, visited: ["a"], current: 1 },
    { type: "hashmap", line: 0, desc: "Same", map: { a: 1 }, visited: ["a"], current: 1 },
  ];

  assert.equal(hasMeaningfulTraversal(steps), false);
});

test("tree problems generate tree visualizations, not array/sliding-window", () => {
  assert.equal(
    pickShape("lowest-common-ancestor-of-a-binary-tree", [
      "Tree",
      "Depth-First Search",
      "Binary Tree",
    ]),
    "tree",
  );
  const fallback = localFallbackViz("lowest-common-ancestor-of-a-binary-tree", [
    "Tree",
    "Depth-First Search",
    "Binary Tree",
  ]);
  assert.equal(fallback.steps[0]?.type, "tree");
  assert.ok(fallback.steps.some((step) => step.tree && Array.isArray(step.tree)));
});

test("linked-list problems generate linkedlist visualizations, not array", () => {
  assert.equal(pickShape("reverse-linked-list", ["Linked List", "Recursion"]), "linkedlist");
  const fallback = localFallbackViz("reverse-linked-list", ["Linked List", "Recursion"]);
  assert.equal(fallback.steps[0]?.type, "linkedlist");
  assert.ok(fallback.steps.some((step) => step.list && Array.isArray(step.list)));
});

test("graph problems generate graph visualizations, not array", () => {
  assert.equal(
    pickShape("course-schedule", [
      "Graph",
      "Topological Sort",
      "Depth-First Search",
      "Breadth-First Search",
    ]),
    "graph",
  );
  const fallback = localFallbackViz("course-schedule", ["Graph", "Topological Sort"]);
  assert.equal(fallback.steps[0]?.type, "graph");
  assert.ok(fallback.steps.some((step) => step.matrix && Array.isArray(step.matrix)));
});

test("matrix problems generate matrix visualizations, not array", () => {
  assert.equal(
    pickShape("construct-quad-tree", ["Array", "Divide and Conquer", "Tree", "Matrix"]),
    "matrix",
  );
  const fallback = localFallbackViz("construct-quad-tree", [
    "Array",
    "Divide and Conquer",
    "Tree",
    "Matrix",
  ]);
  assert.equal(fallback.steps[0]?.type, "matrix");
  assert.ok(fallback.steps.some((step) => step.matrix && Array.isArray(step.matrix)));
});

test("stack problems generate stack visualizations, not array", () => {
  assert.equal(pickShape("min-stack", ["Stack", "Design"]), "stack");
  const fallback = localFallbackViz("min-stack", ["Stack", "Design"]);
  assert.equal(fallback.steps[0]?.type, "stack");
  assert.ok(fallback.steps.some((step) => step.stack && Array.isArray(step.stack)));
});

test("does not confuse tree with graph/matrix even when both present", () => {
  // Tree should take priority over matrix in topic ordering
  assert.equal(
    pickShape("construct-quad-tree", ["Array", "Divide and Conquer", "Tree", "Matrix"]),
    "matrix",
  );
  // But a pure tree problem should use tree
  assert.equal(
    pickShape("lowest-common-ancestor-of-a-binary-tree", ["Tree", "Depth-First Search"]),
    "tree",
  );
});

test("does not confuse linked-list with hash-table even when both present", () => {
  // LinkedList should win over Hash Table
  assert.equal(
    pickShape("copy-list-with-random-pointer", ["Hash Table", "Linked List"]),
    "linkedlist",
  );
  // But a pure hash problem should use hashmap
  assert.equal(pickShape("two-sum", ["Array", "Hash Table"]), "hashmap");
});

test("auto-fixes frozen line numbers when all steps have same line", () => {
  // Simulate AI generating steps all with line: 2 (frozen)
  const result = validateAndNormalizeVizPayload(
    {
      code_lines: ["line 0", "line 1", "line 2", "line 3"],
      test_array: [1, 2, 3],
      viz_steps: [
        { type: "array", line: 2, desc: "step 1", array: [1, 2], visited: [] },
        { type: "array", line: 2, desc: "step 2", array: [1, 2, 3], visited: [1] },
        { type: "array", line: 2, desc: "step 3", array: [1, 2, 3], visited: [1, 2] },
      ],
    },
    fallback,
    "array",
  );

  // After auto-fix, steps should have varying line numbers
  const lineNumbers = result.viz_steps.map((s: VizStep) => s.line);
  const uniqueLines = new Set(lineNumbers).size;
  assert.ok(uniqueLines > 1, "Line numbers should be distributed across available code lines");

  // First step should be near start, last step should be near end
  assert.ok(result.viz_steps[result.viz_steps.length - 1]!.line > result.viz_steps[0]!.line);
});

test("prevents premature array updates on zero-initialization lines and pre-mutation loop headers", () => {
  const codeLines = [
    "def checkInclusion(s1, s2):",
    "  if len(s1) > len(s2): return False",
    "  # line 2",
    "  # line 3",
    "  # line 4",
    "  # line 5",
    "  # line 6",
    "  # line 7",
    "  s1_count = ARRAY OF SIZE 26 FILLED WITH 0",
    "  s2_count = ARRAY OF SIZE 26 FILLED WITH 0",
    "  for i in range(len(s1)):",
    "    # loop header",
    "    s1_count[s1[i] - 'a'] += 1",
  ];

  // An AI output step 9 (s2_count init) and step 10 (loop header) with premature array mutation [0, 0, 0, 0, 0, 1, 0, ...]
  const prematureArray = new Array(26).fill(0);
  prematureArray[5] = 1;

  const result = validateAndNormalizeVizPayload(
    {
      code_lines: codeLines,
      test_array: [1, 2, 3],
      viz_steps: [
        {
          type: "array",
          line: 8,
          desc: "s1_count = ARRAY OF SIZE 26 FILLED WITH 0",
          array: new Array(26).fill(0),
        },
        {
          type: "array",
          line: 9,
          desc: "s2_count = ARRAY OF SIZE 26 FILLED WITH 0",
          array: prematureArray, // bug: contains premature count 1 at index 5
        },
        {
          type: "array",
          line: 10,
          desc: "for i in range(len(s1)):",
          array: prematureArray, // bug: contains premature count 1 at index 5 on loop header
        },
        {
          type: "array",
          line: 12,
          desc: "s1_count[s1[i]-'a'] += 1",
          array: prematureArray,
        },
      ],
    },
    fallback,
    "array",
  );

  // Step 8 (line 8 - s1_count declaration): array should be all 0s
  assert.equal(result.viz_steps[0]?.array?.[5], 0);

  // Step 9 (line 9 - s2_count declaration): array MUST be sanitized to all 0s (no premature update)
  assert.equal(result.viz_steps[1]?.array?.[5], 0);

  // Step 10 (line 10 - loop header before mutation): array MUST be sanitized to all 0s
  assert.equal(result.viz_steps[2]?.array?.[5], 0);

  // Step 12 (line 12 - increment loop body): array has the updated count 1
  assert.equal(result.viz_steps[3]?.array?.[5], 1);
});

test("prevents premature map mutations before insertion line executes", () => {
  const codeLines = [
    "seen = {}",
    "for i, x in enumerate(nums):",
    "    need = target - x",
    "    if need in seen:",
    "        return [seen[need], i]",
    "    seen[x] = i",
  ];

  const result = validateAndNormalizeVizPayload(
    {
      code_lines: codeLines,
      test_array: [2, 7, 11],
      viz_steps: [
        { type: "hashmap", line: 0, desc: "seen = {}", map: { "2": 0 } },
        { type: "hashmap", line: 1, desc: "for i, x in enumerate(nums):", map: { "2": 0 } },
        { type: "hashmap", line: 2, desc: "need = target - x", map: { "2": 0 } },
        { type: "hashmap", line: 5, desc: "seen[x] = i", map: { "2": 0 } },
      ],
    },
    fallback,
    "hashmap",
  );

  // Steps 0, 1, 2 should all have empty map {}
  assert.deepEqual(result.viz_steps[0]?.map, {});
  assert.deepEqual(result.viz_steps[1]?.map, {});
  assert.deepEqual(result.viz_steps[2]?.map, {});

  // Step 5 (line 5 - seen[x] = i): map has {"2": 0}
  assert.deepEqual(result.viz_steps[3]?.map, { "2": 0 });
});

test("prevents premature stack mutations before push line executes", () => {
  const codeLines = [
    "stack = []",
    "for i, x in enumerate(nums):",
    "    while stack and nums[stack[-1]] < x:",
    "        j = stack.pop()",
    "    stack.append(i)",
  ];

  const result = validateAndNormalizeVizPayload(
    {
      code_lines: codeLines,
      test_array: [4, 7],
      viz_steps: [
        { type: "stack", line: 0, desc: "stack = []", stack: [0] },
        { type: "stack", line: 1, desc: "for i, x in enumerate(nums):", stack: [0] },
        { type: "stack", line: 4, desc: "stack.append(i)", stack: [0] },
      ],
    },
    fallback,
    "stack",
  );

  // Steps 0, 1 should have empty stack []
  assert.deepEqual(result.viz_steps[0]?.stack, []);
  assert.deepEqual(result.viz_steps[1]?.stack, []);

  // Step 4 (line 4 - stack.append(i)): stack has [0]
  assert.deepEqual(result.viz_steps[2]?.stack, [0]);
});

test("supports Python [0] * 26 and Array(26).fill(0) syntax", () => {
  const codeLines = [
    "s1_count = [0] * 26",
    "s2_count = [0] * 26",
    "for i in range(len(s1)):",
    "    s1_count[ord(s1[i]) - 97] += 1",
  ];

  const prematureArray = new Array(26).fill(0);
  prematureArray[5] = 1;

  const result = validateAndNormalizeVizPayload(
    {
      code_lines: codeLines,
      test_array: [1, 2, 3],
      viz_steps: [
        { type: "array", line: 0, desc: "s1_count = [0] * 26", array: prematureArray },
        { type: "array", line: 1, desc: "s2_count = [0] * 26", array: prematureArray },
        { type: "array", line: 2, desc: "for i in range(len(s1)):", array: prematureArray },
        { type: "array", line: 3, desc: "s1_count[ord(s1[i]) - 97] += 1", array: prematureArray },
      ],
    },
    fallback,
    "array",
  );

  assert.equal(result.viz_steps[0]?.array?.[5], 0);
  assert.equal(result.viz_steps[1]?.array?.[5], 0);
  assert.equal(result.viz_steps[2]?.array?.[5], 0);
  assert.equal(result.viz_steps[3]?.array?.[5], 1);
});

test("supports more than 12 code lines without truncating or clamping line indices", () => {
  const longCodeLines = Array.from({ length: 20 }, (_, i) => `line_${i}();`);
  const result = validateAndNormalizeVizPayload(
    {
      code_lines: longCodeLines,
      test_array: [1, 2, 3],
      viz_steps: [
        { type: "array", line: 0, desc: "start", array: [1, 2, 3] },
        { type: "array", line: 12, desc: "middle line 12", array: [1, 2, 3] },
        { type: "array", line: 18, desc: "near end line 18", array: [1, 2, 3] },
      ],
    },
    fallback,
    "array",
  );

  assert.equal(result.code_lines.length, 20);
  assert.equal(result.viz_steps[1]?.line, 12);
  assert.equal(result.viz_steps[2]?.line, 18);
});

test("design-hashmap maps to hashmap shape and resolves distinct lines for put, get, and remove", () => {
  assert.equal(
    pickShape("design-hashmap", ["Array", "Hash Table", "Linked List", "Design"]),
    "hashmap",
  );

  const myHashMapCode = [
    "class MyHashMap:",
    "  def __init__(self):",
    "    self.capacity = 1000",
    "    self.buckets = [[] for _ in range(self.capacity)]",
    "  def hash(self, key):",
    "    raw_hash_code = hash(key)",
    "    RETURN absoluteValue(raw_hash_code) MODULO this.capacity", // line 6
    "  def put(self, key, value):",
    "    idx = self.hash(key)",
    "    self.buckets[idx].append((key, value))", // line 9
    "  def get(self, key):",
    "    idx = self.hash(key)",
    "    for k, v in self.buckets[idx]:",
    "      if k == key: return v",
    "    return -1", // line 14
    "  def remove(self, key):",
    "    idx = self.hash(key)",
    "    bucket = self.buckets[idx]",
    "    for i, (k, v) in enumerate(bucket):",
    "      if k == key:",
    "        del bucket[i]", // line 20
    "        return",
  ];

  // Raw payload where step 2 and step 8 are frozen on line 6 (hash return)
  const rawPayload = {
    code_lines: myHashMapCode,
    test_array: [1, 2, 3],
    viz_steps: [
      { type: "hashmap", line: 1, desc: "Initialize MyHashMap with 1000 buckets", map: {} },
      { type: "hashmap", line: 6, desc: "put(1, 1): hash(1)=1, store in bucket", map: { "1": 1 } },
      {
        type: "hashmap",
        line: 6,
        desc: "put(2, 2): hash(2)=2, store in bucket",
        map: { "1": 1, "2": 2 },
      },
      {
        type: "hashmap",
        line: 6,
        desc: "get(1): hash(1)=1, return value 1",
        map: { "1": 1, "2": 2 },
        visited: [1],
      },
      {
        type: "hashmap",
        line: 6,
        desc: "get(3): hash(3)=3, not found return -1",
        map: { "1": 1, "2": 2 },
      },
      {
        type: "hashmap",
        line: 6,
        desc: "put(2, 1): hash(2)=2, update value to 1",
        map: { "1": 1, "2": 1 },
      },
      {
        type: "hashmap",
        line: 6,
        desc: "get(2): hash(2)=2, return value 1",
        map: { "1": 1, "2": 1 },
        visited: [2],
      },
      { type: "hashmap", line: 6, desc: "Remove key 2: delete from bucket", map: { "1": 1 } }, // Step 8
      { type: "hashmap", line: 6, desc: "get(2): not found in bucket return -1", map: { "1": 1 } },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "hashmap", myHashMapCode);

  // Step 8 ("Remove key 2") should NOT be frozen on line 6 (hash return)
  const step8 = normalized.viz_steps[7];
  assert.ok(step8);
  assert.notEqual(
    step8.line,
    6,
    "Step 8 should not be frozen on the hash function return statement",
  );
  assert.ok(step8.line >= 15, "Step 8 should point to the remove method body");

  // Verify no spurious aux array is attached for class/design problem
  assert.equal(step8.array, undefined, "Design HashMap should not attach a ghost array panel");
});

test("sanitizeMap unwraps nested objects and avoids [object Object]", () => {
  const rawWithNestedObjects = {
    code_lines: ["class MyHashMap:"],
    test_array: [1, 2],
    viz_steps: [
      {
        type: "hashmap",
        line: 0,
        desc: "put(1, 1)",
        map: { "1": { value: 1 }, "2": { val: 2 }, "3": [3, 30] },
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawWithNestedObjects, fallback, "hashmap");
  const step0Map = normalized.viz_steps[0]?.map;
  assert.ok(step0Map);
  assert.equal(step0Map["1"], 1);
  assert.equal(step0Map["2"], 2);
  assert.equal(step0Map["3"], 30);
  assert.notEqual(step0Map["1"], "[object Object]");
  assert.notEqual(step0Map["2"], "[object Object]");
});

test("accurately scopes lines to method boundaries for insert, get, and remove", () => {
  const pseudoLines = [
    "CLASS MyHashMap:", // 0
    "  // Implements put(key, value), get(key), remove(key)", // 1
    "  CONSTRUCTOR():", // 2
    "    this.capacity = 1000", // 3
    "    this.buckets = ARRAY OF SIZE this.capacity", // 4
    "  METHOD hash(key):", // 5
    "    RETURN absoluteValue(key) MODULO this.capacity", // 6
    "  METHOD put(key, value):", // 7
    "    index = this.hash(key)", // 8
    "    bucket = this.buckets[index]", // 9
    "    bucket.APPEND((key, value))", // 10
    "  METHOD get(key):", // 11
    "    index = this.hash(key)", // 12
    "    bucket = this.buckets[index]", // 13
    "    FOR EACH (k, v) IN bucket:", // 14
    "      IF k == key: RETURN v", // 15
    "    RETURN -1", // 16
    "  METHOD remove(key):", // 17
    "    index = this.hash(key)", // 18
    "    bucket = this.buckets[index]", // 19
    "    del bucket[i]", // 20
  ];

  const rawPayload = {
    code_lines: pseudoLines,
    test_array: [1, 2, 3],
    viz_steps: [
      { type: "hashmap", line: 2, desc: "Initialize MyHashMap" }, // Step 1: constructor
      { type: "hashmap", line: 2, desc: "Insert key=1, value=1 into hash map" }, // Step 2: erroneously given line 2 (constructor)
      { type: "hashmap", line: 8, desc: "Retrieve value for key=3... not found" }, // Step 5: erroneously given line 8 (inside put)
      { type: "hashmap", line: 8, desc: "Retrieve value for key=2... after removal" }, // Step 9: erroneously given line 8 (inside put)
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "hashmap", pseudoLines);

  // Step 2 ("Insert key=1, value=1") should be remapped to put method (lines 7-10), NOT constructor (line 2)
  const step2 = normalized.viz_steps[1];
  assert.ok(step2);
  assert.ok(
    step2.line >= 7 && step2.line <= 10,
    `Step 2 should be in put method (7-10), got ${step2.line}`,
  );

  // Step 5 ("Retrieve value for key=3... not found") should be remapped to return -1 (line 16) in get method, NOT put method
  const step5 = normalized.viz_steps[2];
  assert.ok(step5);
  assert.equal(step5.line, 16, `Step 5 should point to RETURN -1 at line 16, got ${step5.line}`);

  // Step 9 ("Retrieve value for key=2... after removal") should also be remapped to return -1 in get method
  const step9 = normalized.viz_steps[3];
  assert.ok(step9);
  assert.equal(step9.line, 16, `Step 9 should point to RETURN -1 at line 16, got ${step9.line}`);
});

test("reverse-substrings-between-each-pair-of-parentheses maps to stack shape and datasets", () => {
  const shape = pickShape("reverse-substrings-between-each-pair-of-parentheses", [
    "String",
    "Stack",
    "Bracket Sequences",
  ]);
  assert.equal(shape, "stack");

  const datasets = getProblemDatasets("reverse-substrings-between-each-pair-of-parentheses", [
    "String",
    "Stack",
    "Bracket Sequences",
  ]);
  assert.equal(datasets[0]?.name, "stack");
  assert.equal(datasets[0]?.label, "Character & Scope Stack");
  assert.equal(datasets[1]?.name, "queue");
  assert.equal(datasets[1]?.label, "Reversal Buffer / Stream Queue");
});

test("preserves empty stack on early steps without injecting fallback array numbers", () => {
  const rawWithEmptyStack = {
    code_lines: ["s = '(u(love)i)'", "stack = []", "for c in s:"],
    test_array: [9, 3, 9, 9, 1, 5, 4, 7], // Seeded fallback digits
    viz_steps: [
      { type: "stack", line: 1, desc: "stack = []", stack: [] },
      { type: "stack", line: 2, desc: "Iterate over characters in input string", stack: [] },
      {
        type: "stack",
        line: 2,
        desc: "Push 'v' onto the stack",
        stack: ["(", "u", "(", "l", "o", "v"],
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawWithEmptyStack, fallback, "stack");

  // Step 2 should have an empty stack [], NEVER [9, 3, 9, 9, 1, 5, 4, 7]
  assert.deepEqual(normalized.viz_steps[0]?.stack, []);
  assert.deepEqual(normalized.viz_steps[1]?.stack, []);

  // Step 3 should have characters
  assert.deepEqual(normalized.viz_steps[2]?.stack, ["(", "u", "(", "l", "o", "v"]);
});

test("binary-tree-level-order-traversal-ii resolves to tree shape with primary tree and auxiliary queue", () => {
  const shape = pickShape("binary-tree-level-order-traversal-ii", [
    "Tree",
    "Breadth-First Search",
    "Binary Tree",
  ]);
  assert.equal(
    shape,
    "tree",
    "Binary tree level-order traversal should resolve to tree, not queue or array",
  );

  const datasets = getProblemDatasets("binary-tree-level-order-traversal-ii", [
    "Tree",
    "Breadth-First Search",
    "Binary Tree",
  ]);
  assert.equal(datasets[0]?.name, "tree");
  assert.equal(datasets[0]?.type, "tree");
  assert.equal(datasets[0]?.role, "primary");
  assert.equal(datasets[1]?.name, "queue");
  assert.equal(datasets[1]?.type, "queue");
  assert.equal(datasets[1]?.role, "auxiliary");
});

test("treeBfs simulator accurately animates dynamic queue and tree traversal", () => {
  const bundle = simulateProblem(
    "binary-tree-level-order-traversal-ii",
    "Binary Tree Level Order Traversal II",
    ["Tree", "Breadth-First Search", "Binary Tree"],
  );

  assert.ok(bundle.steps.length > 5);
  assert.equal(bundle.steps[0]?.type, "tree");
  assert.deepEqual(bundle.steps[0]?.tree, [3, 9, 20, null, null, 15, 7]);
  assert.deepEqual(bundle.steps[0]?.queue, [3]);

  // Queue must dynamically change across steps
  const queueStates = bundle.steps.map((s) => JSON.stringify(s.queue));
  const uniqueQueueStates = new Set(queueStates).size;
  assert.ok(uniqueQueueStates > 3, "Queue should not remain frozen across BFS steps");

  // Step 2 should show dequeue of node 3
  const step2 = bundle.steps[2];
  assert.equal(step2?.current, 3);
  assert.deepEqual(step2?.queue, []);
});

test("accurately aligns step description to dequeue line vs enqueue line", () => {
  const codeLines = [
    "IF root IS NULL: RETURN emptyList", // 0
    "resultList = emptyList", // 1
    "nodeQueue = emptyQueue", // 2
    "Enqueue root into nodeQueue", // 3
    "WHILE nodeQueue is not empty:", // 4
    "  levelSize = nodeQueue.length", // 5
    "  currentLevelList = emptyList", // 6
    "  FOR i FROM 0 TO levelSize - 1:", // 7
    "    currentNode = Dequeue from nodeQueue", // 8
    "    currentLevelList.append(currentNode.val)", // 9
    "    IF currentNode.left IS NOT NULL:", // 10
    "      Enqueue currentNode.left into nodeQueue", // 11
    "    IF currentNode.right IS NOT NULL:", // 12
    "      Enqueue currentNode.right into nodeQueue", // 13
    "  resultList.prepend(currentLevelList)", // 14
    "RETURN resultList", // 15
  ];

  // Test dequeue description
  const dequeueDesc = "currentNode = Dequeue from nodeQueue";
  const inferredDequeueLine = inferLineFromDesc(dequeueDesc, codeLines, 5, 10, true, 11);
  assert.equal(inferredDequeueLine, 8, "Dequeue step must point to line 8, not line 11 (enqueue)");

  // Test left enqueue description
  const enqueueLeftDesc = "Enqueue currentNode.left into nodeQueue";
  const inferredLeftLine = inferLineFromDesc(enqueueLeftDesc, codeLines, 6, 10, true, 8);
  assert.equal(inferredLeftLine, 11, "Enqueue left step must point to line 11");

  // Test right enqueue description
  const enqueueRightDesc = "Enqueue currentNode.right into nodeQueue";
  const inferredRightLine = inferLineFromDesc(enqueueRightDesc, codeLines, 7, 10, true, 8);
  assert.equal(inferredRightLine, 13, "Enqueue right step must point to line 13");
});

test("validateAndNormalizeVizPayload corrects action mismatch where dequeue step points to enqueue line", () => {
  const codeLines = [
    "IF root IS NULL: RETURN emptyList", // 0
    "resultList = emptyList", // 1
    "nodeQueue = emptyQueue", // 2
    "Enqueue root into nodeQueue", // 3
    "WHILE nodeQueue is not empty:", // 4
    "  levelSize = nodeQueue.length", // 5
    "  currentLevelList = emptyList", // 6
    "  FOR i FROM 0 TO levelSize - 1:", // 7
    "    currentNode = Dequeue from nodeQueue", // 8
    "    currentLevelList.append(currentNode.val)", // 9
    "    IF currentNode.left IS NOT NULL:", // 10
    "      Enqueue currentNode.left into nodeQueue", // 11
    "    IF currentNode.right IS NOT NULL:", // 12
    "      Enqueue currentNode.right into nodeQueue", // 13
    "  resultList.prepend(currentLevelList)", // 14
    "RETURN resultList", // 15
  ];

  const rawPayload = {
    code_lines: codeLines,
    test_array: [3, 9, 20, 15, 7],
    viz_steps: [
      {
        type: "tree",
        line: 11, // Bug: incorrectly marked line 11 (enqueue left)
        desc: "currentNode = Dequeue from nodeQueue", // Dequeue description
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [20],
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "tree", codeLines);
  assert.equal(
    normalized.viz_steps[0]?.line,
    8,
    "Action mismatch must be auto-corrected to line 8 (dequeue)",
  );
});

test("all multi-dataset combinations produce correct primary and auxiliary datasets", () => {
  // 1. Grid BFS (Number of Islands / Rotting Oranges)
  const islandDatasets = getProblemDatasets("number-of-islands", [
    "Matrix",
    "Breadth-First Search",
    "Union Find",
  ]);
  assert.equal(islandDatasets[0]?.name, "matrix");
  assert.equal(islandDatasets[1]?.name, "set");
  assert.equal(islandDatasets[2]?.name, "stack");

  // 2. Monotonic Stack (Daily Temperatures)
  const tempDatasets = getProblemDatasets("daily-temperatures", [
    "Array",
    "Stack",
    "Monotonic Stack",
  ]);
  assert.equal(tempDatasets[0]?.name, "array");
  assert.equal(tempDatasets[1]?.name, "stack");

  // 3. Top-K Heap Stream (Top K Frequent Elements)
  const topKDatasets = getProblemDatasets("top-k-frequent-elements", [
    "Array",
    "Hash Table",
    "Heap (Priority Queue)",
  ]);
  assert.equal(topKDatasets[0]?.name, "array");
  assert.equal(topKDatasets[1]?.name, "tree");
  assert.equal(topKDatasets[2]?.name, "map");

  // 4. Sliding Window with Map (Longest Substring)
  const slidingDatasets = getProblemDatasets("longest-substring-without-repeating-characters", [
    "Hash Table",
    "String",
    "Sliding Window",
  ]);
  assert.equal(slidingDatasets[0]?.name, "array");
  assert.equal(slidingDatasets[1]?.name, "map");

  // 5. Dual Array Merge (Merge Sorted Array)
  const mergeDatasets = getProblemDatasets("merge-sorted-array", [
    "Array",
    "Two Pointers",
    "Sorting",
  ]);
  assert.equal(mergeDatasets[0]?.name, "array");
  assert.equal(mergeDatasets[1]?.name, "secondaryArray");

  // 6. LRU Cache (LinkedList + Map)
  const lruDatasets = getProblemDatasets("lru-cache", [
    "Hash Table",
    "Linked List",
    "Design",
    "Doubly-Linked List",
  ]);
  assert.equal(lruDatasets[0]?.name, "list");
  assert.equal(lruDatasets[1]?.name, "map");

  // 7. Array + Map (Two Sum)
  const twoSumDatasets = getProblemDatasets("two-sum", ["Array", "Hash Table"]);
  assert.equal(twoSumDatasets[0]?.name, "array");
  assert.equal(twoSumDatasets[1]?.name, "map");

  // 8. BST (Kth Smallest Element in a BST)
  const bstShape = pickShape("kth-smallest-element-in-a-bst", [
    "Tree",
    "Depth-First Search",
    "Binary Search Tree",
    "Binary Tree",
  ]);
  assert.equal(bstShape, "bst");
  const bstDatasets = getProblemDatasets("kth-smallest-element-in-a-bst", [
    "Tree",
    "Depth-First Search",
    "Binary Search Tree",
    "Binary Tree",
  ]);
  assert.equal(bstDatasets[0]?.name, "tree");
  assert.equal(bstDatasets[0]?.type, "bst");
  assert.equal(bstDatasets[1]?.name, "queue");
});

test("tree node count persists and does not vanish across intermediate traversal steps", () => {
  const treeCodeLines = [
    "nodeQueue = [root]",
    "while nodeQueue:",
    "  currentNode = nodeQueue.pop(0)",
    "  if currentNode.left: nodeQueue.append(currentNode.left)",
    "  if currentNode.right: nodeQueue.append(currentNode.right)",
  ];

  // Simulating an LLM payload where intermediate steps (step 2 & step 3) mistakenly truncated the tree to [3] or [3, 9]
  const rawWithTruncatedTreeSteps = {
    code_lines: treeCodeLines,
    test_array: [3, 9, 20, 15, 7],
    viz_steps: [
      {
        type: "tree",
        line: 0,
        desc: "Initialize queue with root node [3]",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3],
      },
      {
        type: "tree",
        line: 2,
        desc: "currentNode = nodeQueue.pop(0) -> 3",
        tree: [3], // Bug: shrunk to 1 node
        queue: [],
      },
      {
        type: "tree",
        line: 3,
        desc: "Enqueue currentNode.left into nodeQueue",
        tree: [3, 9], // Bug: shrunk to 2 nodes
        queue: [9],
      },
      {
        type: "tree",
        line: 4,
        desc: "Enqueue currentNode.right into nodeQueue",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [9, 20],
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(
    rawWithTruncatedTreeSteps,
    fallback,
    "tree",
    treeCodeLines,
  );

  // Every single step must retain all 5 non-null nodes [3, 9, 20, null, null, 15, 7]
  for (let i = 0; i < normalized.viz_steps.length; i++) {
    const s = normalized.viz_steps[i]!;
    assert.deepEqual(
      s.tree,
      [3, 9, 20, null, null, 15, 7],
      `Step ${i + 1} must preserve the full canonical tree structure without disappearing`,
    );
  }
});

test("dynamically synchronizes frozen/stuck BFS queue and enqueues children (15, 7)", () => {
  const treeCodeLines = [
    "nodeQueue = [root]",
    "while nodeQueue:",
    "  levelSize = len(nodeQueue)",
    "  for _ in range(levelSize):",
    "    currentNode = nodeQueue.pop(0)",
    "    if currentNode.left:",
    "      nodeQueue.append(currentNode.left)",
    "    if currentNode.right:",
    "      nodeQueue.append(currentNode.right)",
  ];

  // Raw steps where LLM left queue frozen with [3] across all steps
  const rawWithFrozenQueue = {
    code_lines: treeCodeLines,
    test_array: [3, 9, 20, 15, 7],
    viz_steps: [
      {
        type: "tree",
        line: 0,
        desc: "Initialize queue with root node [3]",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3],
      },
      {
        type: "tree",
        line: 4,
        desc: "currentNode = nodeQueue.pop(0) -> 3",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3], // Bug: still has 3
      },
      {
        type: "tree",
        line: 6,
        desc: "Enqueue currentNode.left into nodeQueue",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3], // Bug: still has 3
      },
      {
        type: "tree",
        line: 8,
        desc: "Enqueue currentNode.right into nodeQueue",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3], // Bug: still has 3
      },
      {
        type: "tree",
        line: 4,
        desc: "currentNode = nodeQueue.pop(0) -> 20",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3],
      },
      {
        type: "tree",
        line: 6,
        desc: "Enqueue currentNode.left (15) into nodeQueue",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3],
      },
      {
        type: "tree",
        line: 8,
        desc: "Enqueue currentNode.right (7) into nodeQueue",
        tree: [3, 9, 20, null, null, 15, 7],
        queue: [3],
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(
    rawWithFrozenQueue,
    fallback,
    "tree",
    treeCodeLines,
  );

  // Step 1: Init -> [3]
  assert.deepEqual(normalized.viz_steps[0]?.queue, [3]);

  // Step 2: Pop 3 -> []
  assert.deepEqual(normalized.viz_steps[1]?.queue, []);

  // Step 3: Enqueue left 9 -> [9]
  assert.deepEqual(normalized.viz_steps[2]?.queue, [9]);

  // Step 4: Enqueue right 20 -> [9, 20] (node 3 is gone, 9 and 20 are present)
  assert.deepEqual(normalized.viz_steps[3]?.queue, [9, 20]);

  // Step 6: Enqueue left 15 -> [15]
  assert.ok(normalized.viz_steps[5]?.queue?.includes(15));

  // Step 7: Enqueue right 7 -> [15, 7]
  assert.deepEqual(normalized.viz_steps[6]?.queue, [15, 7]);
});

test("coordKey normalizes all coordinate string/array/object representations into canonical row,col", () => {
  assert.equal(coordKey("(0, 1)"), "0,1");
  assert.equal(coordKey("(0,1)"), "0,1");
  assert.equal(coordKey("[0, 1]"), "0,1");
  assert.equal(coordKey("0, 1"), "0,1");
  assert.equal(coordKey("0,1"), "0,1");
  assert.equal(coordKey([0, 1]), "0,1");
  assert.equal(coordKey({ r: 0, c: 1 }), "0,1");
  assert.equal(coordKey({ row: 0, col: 1 }), "0,1");
  assert.equal(coordKey(5), "5");
  assert.equal(coordKey(null), "");
});

test("multi-dataset payloads preserve auxiliary array for stack, map, and heap walkthroughs", () => {
  const stackPayload = {
    code_lines: ["stack = []", "for x in nums:", "  stack.append(x)"],
    test_array: [73, 74, 75, 71, 69, 72, 76, 73],
    viz_steps: [
      {
        type: "stack",
        line: 0,
        desc: "Initialize stack",
        stack: [],
        array: [73, 74, 75, 71, 69, 72, 76, 73],
        left: 0,
      },
      {
        type: "stack",
        line: 2,
        desc: "Push 73 onto stack",
        stack: [0],
        array: [73, 74, 75, 71, 69, 72, 76, 73],
        left: 1,
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(stackPayload, fallback, "stack");
  assert.ok(normalized.viz_steps.length >= 2);
  assert.equal(normalized.viz_steps[0]?.type, "stack");
  assert.deepEqual(normalized.viz_steps[0]?.array, [73, 74, 75, 71, 69, 72, 76, 73]);
  assert.equal(normalized.viz_steps[0]?.left, 0);
  assert.deepEqual(normalized.viz_steps[1]?.array, [73, 74, 75, 71, 69, 72, 76, 73]);
  assert.equal(normalized.viz_steps[1]?.left, 1);
});

test("multi-island grid automatically completes traversal of all remaining islands when AI stops after 1st island", () => {
  const multiIslandMatrix = [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const codeLines = [
    "def maxAreaOfIsland(grid):",
    "    visited = set()",
    "    max_area = 0",
    "    def dfs(r, c):",
    "        visited.add((r, c))",
    "        return 1",
    "    for r in range(len(grid)):",
    "        for c in range(len(grid[0])):",
    "            if grid[r][c] == 1 and (r, c) not in visited:",
    "                max_area = max(max_area, dfs(r, c))",
    "    return max_area",
  ];

  // Simulating an AI model that lazily only returned steps for Island 1 (cells 0,0 and 0,1) and then stopped
  const lazyAiPayload = {
    code_lines: codeLines,
    viz_steps: [
      {
        type: "matrix",
        line: 6,
        desc: "Found land at 0,0. Starting DFS.",
        matrix: multiIslandMatrix,
        cols: 4,
        current: "0,0",
        visited: ["0,0"],
        currentArea: 1,
        maxArea: 1,
      },
      {
        type: "matrix",
        line: 4,
        desc: "Visited adjacent cell 0,1.",
        matrix: multiIslandMatrix,
        cols: 4,
        current: "0,1",
        visited: ["0,0", "0,1"],
        currentArea: 2,
        maxArea: 2,
      },
    ],
  };

  const fallback = localFallbackViz("max-area-of-island", ["Matrix", "DFS"]);
  fallback.steps[0] = { ...fallback.steps[0]!, matrix: multiIslandMatrix, cols: 4 };

  const normalized = validateAndNormalizeVizPayload(lazyAiPayload, fallback, "matrix", codeLines);

  // Must have completed Island 2 (2,2) and Island 3 (3,3)
  assert.ok(normalized.viz_steps.length >= 6, "Must generate steps covering all remaining islands");
  const allVisited = normalized.viz_steps[normalized.viz_steps.length - 1]?.visited ?? [];
  assert.ok(allVisited.includes("2,2"), "Island at (2,2) must be visited");
  assert.ok(allVisited.includes("3,3"), "Island at (3,3) must be visited");
  assert.ok(
    normalized.viz_steps[normalized.viz_steps.length - 1]?.desc.includes(
      "Returning final Max Area",
    ),
    "Must have final completion step",
  );
});

test("preserves string/character arrays across all playback frames without numeric reversion", () => {
  const charArray = ["-", "A", "1", "@", "1", "a", "_", "1"];
  const codeLines = [
    "if len(password) < 8: return False",
    "for i, ch in enumerate(password):",
    "    if ch.islower(): has_lower = True",
    "return True",
  ];

  // AI payload where step 0 provides the character array, but subsequent steps omit array
  const rawAiPayload = {
    test_array: charArray,
    code_lines: codeLines,
    viz_steps: [
      {
        type: "array",
        line: 0,
        desc: "Checking password length: 8 characters >= 8.",
        array: charArray,
        current: null,
      },
      {
        type: "array",
        line: 1,
        desc: "Examine character '-' at index 0.",
        current: "-",
        left: 0,
      },
      {
        type: "array",
        line: 1,
        desc: "Examine character 'A' at index 1.",
        current: "A",
        left: 1,
      },
    ],
  };

  const numericFallback = {
    code: ["best = nums[0]"],
    array: [7, 3, 9, 2, 8, 4, 1],
    steps: [{ type: "array" as const, line: 0, desc: "fallback", array: [7, 3, 9, 2, 8, 4, 1] }],
  };

  const normalized = validateAndNormalizeVizPayload(rawAiPayload, numericFallback, "array", codeLines);

  // 1. test_array must retain the string characters
  assert.deepEqual(normalized.test_array, charArray);

  // 2. Step 0 and subsequent steps (1, 2) MUST retain the string character array, NOT numeric fallback!
  assert.deepEqual(normalized.viz_steps[0]?.array, charArray);
  assert.deepEqual(normalized.viz_steps[1]?.array, charArray, "Frame 1 must NOT revert to numeric array");
  assert.deepEqual(normalized.viz_steps[2]?.array, charArray, "Frame 2 must NOT revert to numeric array");
  assert.equal(normalized.viz_steps[1]?.current, "-");
  assert.equal(normalized.viz_steps[2]?.current, "A");
});

test("binary tree preorder traversal synchronizes stack, tree, active node and visited path", () => {
  const codeLines = [
    "stack = [root]",
    "res = []",
    "while stack:",
    "  node = stack.pop()",
    "  res.append(node.val)",
    "  if node.right: stack.append(node.right)",
    "  if node.left: stack.append(node.left)",
    "return res",
  ];

  const canonicalTree = [1, null, 2, null, null, 3];

  const rawAiPayload = {
    code_lines: codeLines,
    test_array: [1, 2, 3],
    viz_steps: [
      {
        type: "tree",
        line: 0,
        desc: "Initialize stack with root [1].",
        stack: [1],
        tree: canonicalTree,
        current: 1,
      },
      {
        type: "tree",
        line: 3,
        desc: "node = stack.pop() -> visit node 1.",
        stack: [],
        current: null, // AI omitted current and visited
      },
      {
        type: "tree",
        line: 5,
        desc: "node.right exists -> push node 2.",
        stack: [2],
        current: null,
      },
      {
        type: "tree",
        line: 3,
        desc: "node = stack.pop() -> visit node 2.",
        stack: [],
        current: null,
      },
      {
        type: "tree",
        line: 6,
        desc: "node.left exists -> push node 3.",
        stack: [3],
        current: null,
      },
      {
        type: "tree",
        line: 3,
        desc: "node = stack.pop() -> visit node 3.",
        stack: [],
        current: null,
      },
    ],
  };

  const fallback = {
    code: codeLines,
    array: [1, 2, 3],
    steps: [
      {
        type: "tree" as const,
        line: 0,
        desc: "fallback tree",
        tree: canonicalTree,
        current: 1,
        visited: [],
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawAiPayload, fallback, "tree", codeLines);

  // 1. Every step must have the canonical tree structure
  for (const step of normalized.viz_steps) {
    assert.deepEqual(step.tree, canonicalTree, "Tree structure must be preserved on all steps");
    assert.equal(step.type, "tree", "Type must remain tree");
  }

  // 2. Active node (current) must be recognized on pop steps
  assert.equal(normalized.viz_steps[1]?.current, 1);
  assert.equal(normalized.viz_steps[3]?.current, 2);
  assert.equal(normalized.viz_steps[5]?.current, 3);

  // 3. Visited array must dynamically accumulate as nodes are traversed
  assert.ok(normalized.viz_steps[1]?.visited?.includes(1), "Step 1 must mark node 1 as visited");
  assert.ok(normalized.viz_steps[3]?.visited?.includes(2), "Step 3 must mark node 2 as visited");
  assert.ok(normalized.viz_steps[5]?.visited?.includes(3), "Step 5 must mark node 3 as visited");
  assert.deepEqual(normalized.viz_steps[5]?.visited, [1, 2, 3], "Final step must have visited all 3 nodes");
});

test("find-common-characters preserves string array and carries hash map state across all steps", () => {
  const dataset: TestDataset = {
    id: "find_common_chars_test",
    label: "Common Characters Standard",
    array: ["bella", "label", "roller"],
  };

  const fallback = simulateProblemWithDataset("find-common-characters", "Find Common Characters", ["Hash Table", "String"], dataset);

  assert.ok(fallback.steps.length >= 4, "Should generate multi-step frequency walkthrough");
  
  // 1. Check array items are string words, not [0, 0, 0]
  assert.deepEqual(fallback.array, ["bella", "label", "roller"], "Array must remain string words");

  // 2. Check each step retains string array and active minCounts map
  for (let i = 0; i < fallback.steps.length; i++) {
    const step = fallback.steps[i]!;
    assert.deepEqual(step.array, ["bella", "label", "roller"], `Step ${i} must preserve string array`);
    assert.ok(step.map && Object.keys(step.map).length > 0, `Step ${i} must preserve non-empty minCounts map`);
  }

  // 3. Test normalization with validateAndNormalizeVizPayload
  const rawAiPayload = {
    code_lines: fallback.code,
    viz_steps: fallback.steps.map((s, idx) => ({
      type: "hashmap",
      line: s.line,
      desc: s.desc,
      // Omit map on final step to test forward persistence
      map: idx === fallback.steps.length - 1 ? undefined : s.map,
    })),
  };

  const normalized = validateAndNormalizeVizPayload(rawAiPayload, fallback, "hashmap");

  const finalStep = normalized.viz_steps[normalized.viz_steps.length - 1];
  assert.ok(finalStep?.map && Object.keys(finalStep.map).length > 0, "Final step must inherit map state instead of becoming empty");
  assert.deepEqual(finalStep?.array, ["bella", "label", "roller"], "Normalized final step must preserve string array");
});

test("validateAndNormalizeVizPayload repairs raw AI steps containing INT_MAX, zero arrays, and pseudo-map keys for find-common-characters", () => {
  const fallback = simulateProblemWithDataset("find-common-characters", "standard");
  const rawPayloadWithGlitches = {
    code_lines: [
      "function commonChars(words):",
      "  minCounts = array of size 26 filled with INFINITY",
      "  for word in words:",
      "    charCounts = array of size 26 filled with 0",
      "    minCounts[char] = min(minCounts[char], charCounts[char])",
      "  return result",
    ],
    test_array: ["bella", "label", "roller"],
    viz_steps: [
      {
        type: "array",
        line: 1,
        desc: "Step 1: Initialize minCounts with INFINITY",
        array: [2147483647, 2147483647, 2147483647],
        map: { minCounts: "26x INFINITY" },
      },
      {
        type: "array",
        line: 3,
        desc: "Step 2: Initialize charCounts with 0",
        array: [0, 0, 0, 0, 0],
        map: { charCounts: 0 },
      },
      {
        type: "hashmap",
        line: 4,
        desc: "Step 3: Min counts: e: 1, l: 2",
        array: ["e", "l", "l"],
        map: { e: 1, l: 2 },
      },
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayloadWithGlitches, fallback, "hashmap");

  for (let i = 0; i < normalized.viz_steps.length; i++) {
    const step = normalized.viz_steps[i]!;
    assert.deepEqual(
      step.array,
      ["bella", "label", "roller"],
      `Step ${i + 1} array must be canonical string words, not INT_MAX, zeros, or result letters`,
    );
  }

  // Step 1 & 2 pseudo-keys removed
  assert.deepEqual(normalized.viz_steps[0]?.map, {}, "Pseudo-key minCounts: 26x INFINITY must be stripped");
  assert.deepEqual(normalized.viz_steps[2]?.map, { e: 1, l: 2 }, "Valid key-value map e:1, l:2 preserved");
});

test("validateAndNormalizeVizPayload extracts i and j loop variables into dual pointers with labels", () => {
  const rawPayload = {
    code_lines: [
      "for i in range(len(nums)):",
      "    for j in range(i + 1, len(nums)):",
      "        if nums[i] + nums[j] == target:",
      "            return [i, j]",
    ],
    test_array: [2, 7, 11, 15],
    viz_steps: [
      {
        type: "array",
        line: 2,
        desc: "Checking nums[0] + nums[1] == 9",
        i: 0,
        j: 1,
      } as any,
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "array");
  const step = normalized.viz_steps[0]!;
  assert.equal(step.left, 0, "Extracts i into left pointer");
  assert.equal(step.right, 1, "Extracts j into right pointer");
  assert.deepEqual(
    step.pointer_labels,
    { left: "i", right: "j" },
    "Populates pointer_labels with i and j",
  );
});

test("validateAndNormalizeVizPayload extracts slow and fast pointers with labels", () => {
  const rawPayload = {
    code_lines: ["slow = 0", "for fast in range(len(nums)): if nums[fast] != 0: nums[slow] = nums[fast]; slow += 1"],
    test_array: [0, 1, 0, 3, 12],
    viz_steps: [
      {
        type: "array",
        line: 1,
        desc: "Inspecting nums[fast]",
        slow: 0,
        fast: 1,
      } as any,
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "array");
  const step = normalized.viz_steps[0]!;
  assert.equal(step.left, 0, "Extracts slow into left pointer");
  assert.equal(step.right, 1, "Extracts fast into right pointer");
  assert.deepEqual(
    step.pointer_labels,
    { left: "slow", right: "fast" },
    "Populates pointer_labels with slow and fast",
  );
});

test("validateAndNormalizeVizPayload extracts start and end / window pointers with labels", () => {
  const rawPayload = {
    code_lines: ["while end < len(s):", "    if s[end] in seen: start += 1", "    end += 1"],
    test_array: ["a", "b", "c", "a"],
    viz_steps: [
      {
        type: "array",
        line: 1,
        desc: "Active window [0..2]",
        window: [0, 2],
      } as any,
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "array");
  const step = normalized.viz_steps[0]!;
  assert.equal(step.left, 0, "Extracts window[0] into left pointer");
  assert.equal(step.right, 2, "Extracts window[1] into right pointer");
  assert.deepEqual(
    step.pointer_labels,
    { left: "left", right: "right" },
    "Populates pointer_labels with left and right",
  );
});

test("validateAndNormalizeVizPayload extracts low, high, mid binary search pointers with labels", () => {
  const rawPayload = {
    code_lines: ["while low <= high:", "    mid = (low + high) // 2", "    if nums[mid] == target: return mid"],
    test_array: [1, 3, 5, 7, 9, 11],
    viz_steps: [
      {
        type: "array",
        line: 1,
        desc: "Checking mid index 2",
        low: 0,
        high: 5,
        mid: 2,
      } as any,
    ],
  };

  const normalized = validateAndNormalizeVizPayload(rawPayload, fallback, "array");
  const step = normalized.viz_steps[0]!;
  assert.equal(step.left, 0, "Extracts low into left pointer");
  assert.equal(step.right, 5, "Extracts high into right pointer");
  assert.equal(step.current, 2, "Extracts mid into current pointer");
  assert.deepEqual(
    step.pointer_labels,
    { left: "low", right: "high", current: "mid" },
    "Populates pointer_labels with low, high, and mid",
  );
});



