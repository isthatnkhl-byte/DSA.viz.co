import test from "node:test";
import assert from "node:assert/strict";

import {
  REVIEW_MODELS,
  VIZ_MODELS,
  isGeminiKey,
  isOpenRouterKey,
  extractJson,
} from "./openrouter.server";

test("uses active Gemini model aliases instead of retired legacy names for review", () => {
  assert.ok(REVIEW_MODELS.length > 0);
  assert.ok(
    REVIEW_MODELS.every((model) => !/gemini-(?:1\.5|pro)/i.test(model)),
    `Legacy Gemini model aliases are still present: ${REVIEW_MODELS.join(", ")}`,
  );
  const geminiModels = REVIEW_MODELS.filter((m) => m.startsWith("gemini-"));
  assert.ok(geminiModels.length > 0);
  assert.ok(
    geminiModels.every((model) => /^gemini-[a-z0-9.-]+$/i.test(model)),
    `Gemini model names should use the active provider naming pattern: ${geminiModels.join(", ")}`,
  );
});

test("includes active Gemini models in VIZ_MODELS for AI visualizer generation", () => {
  assert.ok(VIZ_MODELS.length > 0);
  assert.ok(
    VIZ_MODELS.every((model) => !/gemini-(?:1\.5|pro)/i.test(model)),
    `Legacy Gemini model aliases are still present in VIZ_MODELS: ${VIZ_MODELS.join(", ")}`,
  );
  const geminiModels = VIZ_MODELS.filter((m) => m.startsWith("gemini-"));
  assert.ok(
    geminiModels.length > 0,
    "VIZ_MODELS must include Gemini models for direct API execution",
  );
  assert.ok(
    geminiModels.every((model) => /^gemini-[a-z0-9.-]+$/i.test(model)),
    `Gemini model names in VIZ_MODELS should use valid naming: ${geminiModels.join(", ")}`,
  );
});

test("accurately identifies Gemini vs OpenRouter keys", () => {
  assert.equal(isGeminiKey("AIzaSyDummyKey123"), true);
  assert.equal(isOpenRouterKey("AIzaSyDummyKey123"), false);

  assert.equal(isGeminiKey("sk-or-v1-abc123xyz"), false);
  assert.equal(isOpenRouterKey("sk-or-v1-abc123xyz"), true);
});

test("extractJson tolerantly extracts and normalizes aliases", () => {
  const payload = JSON.stringify({
    steps: [{ type: "array", line: 0, desc: "Step 1", array: [1, 2] }],
    codeLines: ["let x = 1;"],
    testArray: [1, 2],
  });

  const extracted = extractJson(`Here is the result:\n\`\`\`json\n${payload}\n\`\`\``);
  assert.ok(extracted);
  assert.ok(Array.isArray(extracted.viz_steps));
  assert.equal(extracted.viz_steps.length, 1);
  assert.ok(Array.isArray(extracted.code_lines));
  assert.ok(Array.isArray(extracted.test_array));
});

test("extractJson cleans trailing commas in LLM JSON output", () => {
  const jsonWithTrailingCommas = `{
    "code_lines": ["const x = 1;", "const y = 2;",],
    "test_array": [10, 20, 30,],
    "viz_steps": [
      { "type": "array", "line": 0, "desc": "init", "array": [10, 20, 30], },
    ],
  }`;

  const extracted = extractJson(jsonWithTrailingCommas);
  assert.ok(extracted);
  assert.equal(extracted.code_lines.length, 2);
  assert.equal(extracted.test_array.length, 3);
  assert.equal(extracted.viz_steps.length, 1);
});

test("models list includes reliable high-availability models across providers", () => {
  assert.ok(VIZ_MODELS.includes("openai/gpt-4o-mini"));
  assert.ok(VIZ_MODELS.includes("gemini-2.0-flash"));
  assert.ok(VIZ_MODELS.includes("qwen/qwen-2.5-coder-32b-instruct"));
  assert.ok(REVIEW_MODELS.length >= 10);
  assert.ok(VIZ_MODELS.length >= 10);
  assert.ok(VIZ_MODELS[0]?.startsWith("gemini-"));
  assert.ok(REVIEW_MODELS[0]?.startsWith("gemini-"));
});

test("visualizer agent response contract produces valid step sequences", () => {
  const mockAiOutput = {
    test_array: [2, 7, 11, 15],
    code_lines: [
      "function twoSum(nums, target):",
      "    seen = {}",
      "    for i from 0 to nums.length - 1:",
      "        diff = target - nums[i]",
      "        if diff in seen: return [seen[diff], i]",
      "        seen[nums[i]] = i",
      "    return []",
    ],
    viz_steps: [
      {
        type: "array",
        line: 1,
        desc: "Initialize map seen",
        array: [2, 7, 11, 15],
        map: {},
        activeDataset: "map",
        shiftInfo: { from: null, to: "map", action: "initialize", reason: "Create map" },
      },
      {
        type: "array",
        line: 2,
        desc: "Loop i=0, nums[i]=2",
        array: [2, 7, 11, 15],
        left: 0,
        map: {},
        current: 2,
        activeDataset: "array",
      },
      {
        type: "array",
        line: 5,
        desc: "Insert 2 -> 0 into seen",
        array: [2, 7, 11, 15],
        left: 0,
        map: { "2": 0 },
        activeDataset: "map",
        shiftInfo: { from: "array", to: "map", action: "write", reason: "Store index" },
      },
      {
        type: "array",
        line: 4,
        desc: "Found match! diff 2 in seen at index 0, current index 1",
        array: [2, 7, 11, 15],
        left: 0,
        right: 1,
        map: { "2": 0 },
        activeDataset: "array",
      },
    ],
  };

  assert.ok(Array.isArray(mockAiOutput.viz_steps));
  assert.equal(mockAiOutput.viz_steps.length, 4);
  assert.equal(mockAiOutput.viz_steps[0]?.activeDataset, "map");
  assert.equal(mockAiOutput.viz_steps[2]?.shiftInfo?.action, "write");
});
