import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_INTERVIEW_PROBLEMS,
  getRandomInterviewProblem,
  type ProblemTier,
} from "./live-interview-problems";

test("LIVE_INTERVIEW_PROBLEMS - contains high-signal interview problems", () => {
  assert.ok(LIVE_INTERVIEW_PROBLEMS.length >= 4, "Should have at least 4 curated interview problems");

  const ids = new Set<string>();
  for (const p of LIVE_INTERVIEW_PROBLEMS) {
    assert.ok(p.id, "Problem must have an id");
    assert.ok(p.title, `Problem ${p.id} must have a title`);
    assert.ok(p.difficulty, `Problem ${p.id} must have a difficulty`);
    assert.ok(p.category, `Problem ${p.id} must have a category`);
    assert.ok(p.description, `Problem ${p.id} must have a description`);
    assert.ok(!ids.has(p.id), `Problem id ${p.id} must be unique`);
    ids.add(p.id);

    // Verify 3 distinct tiers (1 = brute, 2 = better, 3 = optimal)
    assert.ok(p.tiers[1], `Problem ${p.id} must define tier 1`);
    assert.ok(p.tiers[2], `Problem ${p.id} must define tier 2`);
    assert.ok(p.tiers[3], `Problem ${p.id} must define tier 3`);

    const tierKeys: Array<1 | 2 | 3> = [1, 2, 3];
    for (const tierKey of tierKeys) {
      const tier = p.tiers[tierKey];
      assert.ok(tier.name, `${p.id} ${tierKey} must have a name`);
      assert.ok(tier.complexityTag, `${p.id} ${tierKey} must define complexityTag`);
      assert.ok(tier.objective, `${p.id} ${tierKey} must have an objective`);
      assert.ok(tier.socraticHints.length > 0, `${p.id} ${tierKey} must have socratic hints`);
      assert.ok(tier.interviewerPraise, `${p.id} ${tierKey} must have interviewer praise`);
      assert.ok(tier.nextPrompt, `${p.id} ${tierKey} must have next prompt`);

      // Starter code for all 3 languages
      assert.ok(tier.starterCode.python?.length > 10, `${p.id} ${tierKey} must have python starter`);
      assert.ok(tier.starterCode.javascript?.length > 10, `${p.id} ${tierKey} must have javascript starter`);
      assert.ok(tier.starterCode.typescript?.length > 10, `${p.id} ${tierKey} must have typescript starter`);

      // Test cases
      assert.ok(tier.testCases.length >= 2, `${p.id} ${tierKey} must have at least 2 test cases`);
      for (const tc of tier.testCases) {
        assert.ok(tc.input !== undefined, `${p.id} ${tierKey} test case must have input`);
        assert.ok(tc.expected !== undefined, `${p.id} ${tierKey} test case must have expected`);
        assert.ok(tc.description, `${p.id} ${tierKey} test case must have description`);
      }
    }
  }
});

test("getRandomInterviewProblem - returns valid problem and supports exclusion", () => {
  const p1 = getRandomInterviewProblem();
  assert.ok(p1, "Should return a problem");
  assert.ok(LIVE_INTERVIEW_PROBLEMS.includes(p1), "Problem should be from problem bank");

  // Re-roll excluding p1 when > 1 problem
  const p2 = getRandomInterviewProblem(p1.id);
  assert.ok(p2, "Should return another problem");
  assert.notEqual(p2.id, p1.id, "Should not return excluded problem when alternatives exist");
});
