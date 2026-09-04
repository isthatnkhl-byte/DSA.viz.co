import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_INTERVIEW_PROBLEMS,
  getRandomInterviewProblem,
  generateLocalSocraticAnswer,
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

      // Starter code for all 4 languages (clean LeetCode-style class Solution scaffold with no comments)
      assert.ok(tier.starterCode.python?.length > 10, `${p.id} ${tierKey} must have python starter`);
      assert.ok(tier.starterCode.cpp?.length > 10, `${p.id} ${tierKey} must have cpp starter`);
      assert.ok(tier.starterCode.javascript?.length > 10, `${p.id} ${tierKey} must have javascript starter`);
      assert.ok(tier.starterCode.typescript?.length > 10, `${p.id} ${tierKey} must have typescript starter`);
      assert.ok(tier.starterCode.python.includes("class Solution:"), `${p.id} ${tierKey} python starter must have class Solution:`);
      assert.ok(tier.starterCode.python.includes("pass"), `${p.id} ${tierKey} python starter must have pass`);
      assert.ok(tier.starterCode.cpp.includes("class Solution"), `${p.id} ${tierKey} cpp starter must have class Solution`);
      assert.ok(tier.starterCode.cpp.includes("#include"), `${p.id} ${tierKey} cpp starter must include headers`);

      // Reference solution exists for study/guidance across all 4 languages
      assert.ok(tier.referenceSolution.python?.length > 20, `${p.id} ${tierKey} must have python reference solution`);
      assert.ok(tier.referenceSolution.cpp?.length > 20, `${p.id} ${tierKey} must have cpp reference solution`);
      assert.ok(tier.referenceSolution.javascript?.length > 20, `${p.id} ${tierKey} must have javascript reference solution`);
      assert.ok(tier.referenceSolution.typescript?.length > 20, `${p.id} ${tierKey} must have typescript reference solution`);

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

test("generateLocalSocraticAnswer - refuses to give code and provides accurate Socratic guidance", () => {
  const twoSum = LIVE_INTERVIEW_PROBLEMS.find((p) => p.id === "two-sum")!;

  // 1. Candidate begs for code / answer -> Interviewer refuses code
  const codeBegAnswer = generateLocalSocraticAnswer("can you give me the code for optimal", twoSum, 3);
  assert.ok(codeBegAnswer.toLowerCase().includes("write the implementation"), "Should refuse to give code");
  assert.ok(!codeBegAnswer.includes("def twoSum"), "Must never leak solution code");

  // 2. Candidate asks if array is sorted -> Accurately clarifies unsorted
  const sortedAnswer = generateLocalSocraticAnswer("are the numbers sorted", twoSum, 1);
  assert.ok(sortedAnswer.toLowerCase().includes("unsorted"), "Should clarify that array is unsorted");

  // 3. Candidate asks if negative values allowed -> Accurately confirms bounds
  const negativeAnswer = generateLocalSocraticAnswer("can values be negative", twoSum, 1);
  assert.ok(negativeAnswer.toLowerCase().includes("negative"), "Should address negative numbers");

  // 4. Candidate asks for hint -> Returns Socratic hint
  const hintAnswer = generateLocalSocraticAnswer("can i have a hint please", twoSum, 1);
  assert.ok(hintAnswer.length > 10, "Should return helpful hint");
  assert.equal(hintAnswer, twoSum.tiers[1].socraticHints[0], "Should match tier 1 socratic hint");

  // 5. Candidate asks about space limit -> Quotes tier complexity
  const spaceAnswer = generateLocalSocraticAnswer("what is the memory limit", twoSum, 2);
  assert.ok(spaceAnswer.includes(twoSum.tiers[2].complexityTag), "Should mention tier complexity tag");

  // 6. Candidate asks about edge cases / empty arrays -> Accurately addresses edge cases
  const edgeAnswer = generateLocalSocraticAnswer("are there edge cases like empty array", twoSum, 1);
  assert.ok(edgeAnswer.toLowerCase().includes("guarantee") || edgeAnswer.toLowerCase().includes("constraints"), "Should clarify input constraints");

  // 7. Candidate asks what should be returned -> Clarifies return type
  const returnAnswer = generateLocalSocraticAnswer("what should i return indices or values", twoSum, 1);
  assert.ok(returnAnswer.toLowerCase().includes("indices"), "Should specify indices are returned");
});

test("Interview Rating System - severely penalizes disqualification, zero tiers, and abandonment", async () => {
  const { saveInterviewSession } = await import("../lib/interview-rating");

  // 1. Test 3-strike disqualification penalty (-25 pts)
  const disqResult = await saveInterviewSession({
    problemId: "two-sum",
    problemTitle: "Two Sum",
    compositeScore: 0.5,
    confidenceScore: 0.5,
    craftScore: 0.0,
    integrityScore: 0.0,
    strikes: 3,
    isDisqualified: true,
  });

  assert.equal(disqResult.ratingDelta, -25, "Rating delta must be -25 on 3 strikes disqualification");
  assert.equal(disqResult.record.status, "DISQUALIFIED", "Status should be marked DISQUALIFIED");
  assert.equal(disqResult.newRating, Math.max(0, disqResult.previousRating + disqResult.ratingDelta));

  // 2. Test candidate concession / early abandonment (-22 pts)
  const forfeitResult = await saveInterviewSession({
    problemId: "two-sum",
    problemTitle: "Two Sum",
    compositeScore: 1.0,
    confidenceScore: 0.5,
    craftScore: 0.0,
    integrityScore: 8.0,
    strikes: 0,
    isDisqualified: false,
    isAbandoned: true,
    completedTiersCount: 0,
  });

  assert.equal(forfeitResult.ratingDelta, -22, "Rating delta must be -22 on early abandonment");
  assert.equal(forfeitResult.record.status, "ABANDONED", "Status should be marked ABANDONED");

  // 3. Test zero tiers completed / unsubmitted code (-20 pts)
  const zeroTiersResult = await saveInterviewSession({
    problemId: "two-sum",
    problemTitle: "Two Sum",
    compositeScore: 1.2,
    confidenceScore: 0.5,
    craftScore: 0.0,
    integrityScore: 10.0,
    strikes: 0,
    isDisqualified: false,
    completedTiersCount: 0,
  });

  assert.equal(zeroTiersResult.ratingDelta, -20, "Rating delta must be -20 when zero tiers are completed");
  assert.equal(zeroTiersResult.record.status, "FAILED", "Status should be marked FAILED");

  // 4. Test strong positive performance maintaining / boosting /100 rating
  const passResult = await saveInterviewSession({
    problemId: "two-sum",
    problemTitle: "Two Sum",
    compositeScore: 9.5,
    confidenceScore: 9.0,
    craftScore: 10.0,
    integrityScore: 10.0,
    strikes: 0,
    isDisqualified: false,
    completedTiersCount: 3,
  });

  assert.ok(passResult.ratingDelta >= 3, "Strong positive interview should boost rating significantly");
  assert.equal(passResult.record.status, "PASSED", "Status should be PASSED");
  assert.ok(passResult.newRating <= 100, "Rating must be capped at 100");
});

test("Interview Runner - executes JS and TS code against live problem test cases", async () => {
  const { runClientJsTs, stripTypeScriptTypes, areOutputsEqual } = await import("../lib/interview-runner");
  const twoSum = LIVE_INTERVIEW_PROBLEMS.find((p) => p.id === "two-sum")!;

  // 1. Test stripTypeScriptTypes
  const tsCode = `class Solution { twoSum(nums: number[], target: number): number[] { return [0, 1]; } }`;
  const stripped = stripTypeScriptTypes(tsCode);
  assert.ok(!stripped.includes("number[]"), "Types should be stripped");
  assert.ok(stripped.includes("return [0, 1]"), "Code body should remain");

  // 2. Test areOutputsEqual for Two Sum (order-agnostic index pairs)
  assert.ok(areOutputsEqual("two-sum", [0, 1], [0, 1]), "Matching pairs should pass");
  assert.ok(areOutputsEqual("two-sum", [1, 0], [0, 1]), "Reversed index pairs should pass for Two Sum");
  assert.ok(!areOutputsEqual("two-sum", [0, 2], [0, 1]), "Diverging pairs should fail");

  // 3. Test valid JavaScript solution execution on Tier 1
  const validJsCode = twoSum.tiers[1].referenceSolution.javascript;
  const jsRun = runClientJsTs({
    code: validJsCode,
    language: "javascript",
    problem: twoSum,
    tier: twoSum.tiers[1],
  });
  assert.ok(jsRun.allPassed, "Valid JS reference solution must pass all test cases");
  assert.equal(jsRun.passedCount, twoSum.tiers[1].testCases.length);

  // 4. Test valid TypeScript solution execution on Tier 3 (optimal Hash Map)
  const validTsCode = twoSum.tiers[3].referenceSolution.typescript;
  const tsRun = runClientJsTs({
    code: validTsCode,
    language: "typescript",
    problem: twoSum,
    tier: twoSum.tiers[3],
  });
  assert.ok(tsRun.allPassed, "Valid TS reference solution must pass all test cases");
  assert.equal(tsRun.passedCount, twoSum.tiers[3].testCases.length);

  // 5. Test incomplete / incorrect code rejection
  const invalidCode = `class Solution { twoSum(nums, target) { return [99, 99]; } }`;
  const failRun = runClientJsTs({
    code: invalidCode,
    language: "javascript",
    problem: twoSum,
    tier: twoSum.tiers[1],
  });
  assert.equal(failRun.allPassed, false, "Incorrect solution must be rejected");
  assert.ok(failRun.results.some((r) => !r.passed), "At least one test case must fail");
});

test("Server Interview Evaluator - validates VM execution for JS/TS submissions", async () => {
  const { evaluateInterviewSubmission } = await import("../lib/server-interview-evaluator");
  const twoSum = LIVE_INTERVIEW_PROBLEMS.find((p) => p.id === "two-sum")!;

  const result = await evaluateInterviewSubmission({
    language: "typescript",
    code: twoSum.tiers[3].referenceSolution.typescript,
    problemSlug: twoSum.slug,
    functionName: twoSum.functionSignature.name,
    currentTier: 3,
    testCases: twoSum.tiers[3].testCases,
  });

  assert.ok(result.allPassed, "Server evaluator should pass valid TS two-sum optimal solution");
  assert.equal(result.passedCount, twoSum.tiers[3].testCases.length);
});

test("cleanTextForHumanSpeech - phoneticizes Big-O notation, code operators, and strips markdown syntax", async () => {
  const { cleanTextForHumanSpeech } = await import("../lib/interview-speech");

  // 1. Big-O notations converted to natural spoken English
  assert.equal(cleanTextForHumanSpeech("Target is O(1) space."), "Target is O of 1 space.");
  assert.equal(cleanTextForHumanSpeech("We need O(N) time."), "We need O of N time.");
  assert.equal(cleanTextForHumanSpeech("Brute force has O(N^2) complexity."), "Brute force has O of N squared complexity.");
  assert.equal(cleanTextForHumanSpeech("Better solution uses O(N log N)."), "Better solution uses O of N log N.");
  assert.equal(cleanTextForHumanSpeech("Unicode exponents O(N²) time."), "Unicode exponents O of N squared time.");

  // 2. Markdown formatting stripped
  const mdInput = "Consider **hash map** for lookup: `nums[i] === target`.\n- Point 1\n- Point 2";
  const cleaned = cleanTextForHumanSpeech(mdInput);
  assert.ok(!cleaned.includes("**"), "Markdown asterisks must be stripped");
  assert.ok(!cleaned.includes("`"), "Backticks must be stripped");
  assert.ok(!cleaned.includes("- Point"), "List hyphens must be stripped");
  assert.ok(cleaned.includes("hash map for lookup"), "Content must be preserved");
  assert.ok(cleaned.includes("equals"), "Operators must be phoneticized");
});

test("findBestVoice - ranks high-quality neural voices by gender and accent persona", async () => {
  const { findBestVoice } = await import("../lib/interview-speech");

  const mockVoices = [
    { name: "eSpeak", lang: "en-US" },
    { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US" },
    { name: "Microsoft Jenny Online (Natural) - English (United States)", lang: "en-US" },
    { name: "Microsoft Ryan Online (Natural) - English (United Kingdom)", lang: "en-GB" },
    { name: "Google US English", lang: "en-US" },
  ];

  const alexVoice = findBestVoice(mockVoices, "alex-male");
  assert.ok(alexVoice?.name.includes("Guy"), "Alex should match natural US male voice");

  const sarahVoice = findBestVoice(mockVoices, "sarah-female");
  assert.ok(sarahVoice?.name.includes("Jenny"), "Sarah should match natural US female voice");

  const davidVoice = findBestVoice(mockVoices, "david-british");
  assert.ok(davidVoice?.name.includes("Ryan"), "David should match natural UK voice");
});

test("generateLocalSocraticAnswer - dynamically addresses diverse technical inquiries without repetitive canned phrases", () => {
  const twoSum = LIVE_INTERVIEW_PROBLEMS.find((p) => p.id === "two-sum")!;

  const testInquiries = [
    "how many loops do I need to solve this",
    "can I use recursion here",
    "can I modify the input array in place",
    "are there duplicate numbers in the array",
    "can I trade memory for faster speed",
    "can I write a helper function",
    "what if there are negative numbers",
    "how do I validate my logic before writing code",
    "what should I return if no pair is found",
  ];

  for (const q of testInquiries) {
    const answer = generateLocalSocraticAnswer(q, twoSum, 1);
    assert.ok(answer && answer.length > 20, `Answer for "${q}" must be non-empty`);
    // Crucial check: the old hardcoded canned repetition must NEVER appear
    assert.ok(
      !answer.includes("Good question. For Tier 1, solve brute force"),
      `Inquiry "${q}" must not produce robotic canned phrase`
    );
  }
});



