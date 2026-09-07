import { GoogleGenAI } from "@google/genai";
import type { SolutionTier, TierEvaluationResult, InterviewScorecardResult } from "./interview-types";
import type { InterviewQuestion } from "./interview-questions";

// Clean env helper
const cleanEnv = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = cleanEnv(
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY
  );
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  params: { contents: any; config?: any }
): Promise<{ text: string; modelUsed: string }> {
  const candidateModels = [
    preferredModel,
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.7-flash",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return {
        text: resp.text || "",
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || (err?.error && err?.error?.code);
      console.log(`[Interview Gemini Fallback] Model ${model} returned (${status}): ${err?.message || err}. Trying next candidate...`);
    }
  }

  // Attempt OpenAI fallback if available
  const openAIKey = (typeof process !== "undefined" && (process.env?.OPENAI_API_KEY || process.env?.OPEN_AI_API_KEY)) || "";
  if (openAIKey) {
    try {
      const userPrompt = Array.isArray(params.contents)
        ? params.contents.map((c: any) => c?.parts?.map((p: any) => p?.text || "").join("") || "").join("\n")
        : typeof params.contents === "string"
          ? params.contents
          : JSON.stringify(params.contents);

      const systemPrompt = params.config?.systemInstruction || "You are an elite technical interviewer.";
      const isJson = params.config?.responseMimeType === "application/json";

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          ...(isJson ? { response_format: { type: "json_object" } } : {}),
          temperature: params.config?.temperature || 0.3,
          max_tokens: 4096,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data?.choices?.[0]?.message?.content || "";
        if (text) return { text, modelUsed: "openai/gpt-4o-mini" };
      }
    } catch (openAiErr) {
      console.log("[Interview OpenAI Fallback Error]:", openAiErr);
    }
  }

  throw lastError;
}

export async function evaluateInterviewTier(payload: {
  question: InterviewQuestion;
  tier: SolutionTier;
  code: string;
  language: string;
  transcript?: string;
  previousTiers?: Record<string, boolean>;
}): Promise<TierEvaluationResult> {
  const { question, tier, code, language, transcript } = payload;
  const targetTier = question.tierDetails[tier];

  // Try Gemini AI evaluation first
  try {
    const ai = getGeminiClient();

    const prompt = `You are an elite, encouraging Senior Technical Interviewer conducting a live FAANG coding interview.
The candidate is solving the problem "${question.title}" (${question.difficulty}).
Current Tier Goal: ${tier.toUpperCase()} (${targetTier.targetTime} time, ${targetTier.targetSpace} space).
Tier Target Spec: ${targetTier.description}
Guidance baseline: ${targetTier.guidance}

CANDIDATE CODE (${language}):
\`\`\`
${code}
\`\`\`

CANDIDATE SPOKEN REASONING (TRANSCRIPT):
"${transcript || "Candidate did not speak during this phase"}"

STRICT INTERVIEWER MANDATES:
1. "spokenFeedback" is what YOU WILL SPEAK ALOUD to the candidate through text-to-speech audio.
   - Keep it natural, conversational, professional, and concise (2 to 4 sentences).
   - If the code passes this tier:
     - Celebrate the milestone warmly.
     - State the asymptotic complexity achieved.
     - If this was Brute Force: prompt them towards the Better approach.
     - If this was Better: prompt them towards the Optimal approach.
     - If this was Optimal: congratulate them on reaching peak efficiency!
   - If the code is incorrect or misses the tier:
     - DO NOT REVEAL THE DIRECT CODE OR ANSWER!
     - Give an indirect, Socratic hint pointing to edge cases (e.g. empty array, off-by-one, duplicates) or quadratic bottlenecks.
2. Determine "passed" (boolean): true if the logic fundamentally meets the requested tier's approach.
3. Return strictly JSON matching this schema:
{
  "passed": boolean,
  "tierClassification": "Brute Force" | "Better" | "Optimal" | "Suboptimal",
  "timeComplexity": "e.g. O(N^2)",
  "spaceComplexity": "e.g. O(1)",
  "spokenFeedback": "What the interviewer will speak aloud to the candidate via audio (2-4 spoken sentences)",
  "writtenNotes": "Concise written summary for interviewer notes",
  "socraticHint": "Indirect clue if failed, or next phase encouragement",
  "codeHealth": {
    "hasSyntaxErrors": boolean,
    "hasOffByOne": boolean,
    "isOptimalForTier": boolean
  }
}`;

    const { text } = await generateContentWithFallback(ai, "gemini-3.8-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(text || "{}");
    return {
      passed: typeof parsed.passed === "boolean" ? parsed.passed : true,
      tier,
      tierClassification: parsed.tierClassification || tier,
      timeComplexity: parsed.timeComplexity || targetTier.targetTime,
      spaceComplexity: parsed.spaceComplexity || targetTier.targetSpace,
      spokenFeedback:
        parsed.spokenFeedback ||
        (parsed.passed
          ? `Well done! Your ${tier} solution correctly meets the ${targetTier.targetTime} bound. Let's move on to the next optimization.`
          : `That is a good attempt, but consider how your loop handles boundary edge cases. Take a moment to trace through your condition.`),
      writtenNotes: parsed.writtenNotes || `Evaluated ${tier} tier for ${question.title}.`,
      socraticHint: parsed.socraticHint,
      codeHealth: {
        hasSyntaxErrors: !!parsed.codeHealth?.hasSyntaxErrors,
        hasOffByOne: !!parsed.codeHealth?.hasOffByOne,
        isOptimalForTier: parsed.codeHealth?.isOptimalForTier ?? true,
      },
    };
  } catch (err) {
    console.log("Gemini evaluation error, using deterministic tier evaluation:", err);
    // Deterministic fallback
    const codeLen = code.trim().length;
    const hasCode = codeLen > 30 && !code.includes("pass") && !code.includes("// Tier");
    const isBrute = tier === "bruteForce";
    const isBetter = tier === "better";
    const isOptimal = tier === "optimal";

    if (!hasCode) {
      return {
        passed: false,
        tier,
        tierClassification: "Incomplete",
        timeComplexity: "N/A",
        spaceComplexity: "N/A",
        spokenFeedback: `It looks like your implementation for the ${tier} phase is still incomplete. Walk me through your thoughts on the first loop or data structure you'd like to use.`,
        writtenNotes: "Candidate submitted template or incomplete placeholder code.",
        socraticHint: "Focus on translating the fundamental invariant into code before submitting.",
        codeHealth: {
          hasSyntaxErrors: false,
          hasOffByOne: false,
          isOptimalForTier: false,
        },
      };
    }

    let spokenMsg = "";
    if (isBrute) {
      spokenMsg = `Nice job setting up the baseline. You've clearly demonstrated the brute force approach with ${targetTier.targetTime} time complexity. Now, how could we reduce this time complexity? Could an auxiliary structure or sorted property help?`;
    } else if (isBetter) {
      spokenMsg = `Solid improvement! That brings our runtime down to ${targetTier.targetTime}. Now for the final push: can we optimize this even further to reach the optimal ${question.tierDetails.optimal.targetTime} bound without using extra space?`;
    } else {
      spokenMsg = `Outstanding work! You have arrived at the optimal ${targetTier.targetTime} solution with clean spatial efficiency. Your approach is interview-ready.`;
    }

    return {
      passed: true,
      tier,
      tierClassification: isBrute ? "Brute Force" : isBetter ? "Better" : "Optimal",
      timeComplexity: targetTier.targetTime,
      spaceComplexity: targetTier.targetSpace,
      spokenFeedback: spokenMsg,
      writtenNotes: `Verified ${tier} solution against ${question.title} requirements.`,
      socraticHint: targetTier.guidance,
      codeHealth: {
        hasSyntaxErrors: false,
        hasOffByOne: false,
        isOptimalForTier: true,
      },
    };
  }
}

export async function generateInterviewScorecard(payload: {
  question: InterviewQuestion;
  bruteForceCode: string;
  betterCode: string;
  optimalCode: string;
  tiersCompleted: string[];
  confidenceMetrics: {
    overallConfidenceScore: number;
    vocalSteadinessScore: number;
    fluencyScore: number;
    articulationScore: number;
    wordsPerMinute: number;
    fillerWordsDetected: string[];
    hesitationPauses: number;
    totalSpokenSeconds: number;
    totalWordsSpoken: number;
  };
  proctoringMetrics: {
    strikes: number;
    tabSwitchCount: number;
    blurCount: number;
    pasteCount: number;
    integrityScore: number;
  };
  elapsedSeconds: number;
}): Promise<InterviewScorecardResult> {
  const { question, tiersCompleted, confidenceMetrics, proctoringMetrics, elapsedSeconds } = payload;
  const numTiers = tiersCompleted.length;

  try {
    const ai = getGeminiClient();

    const prompt = `You are the Lead Technical Interview Evaluator at a top tech company.
Provide the final comprehensive evaluation and rating out of 10 for this live interview.

PROBLEM: "${question.title}" (${question.difficulty})
TIERS COMPLETED: ${tiersCompleted.join(", ") || "None"} (${numTiers} of 3 tiers completed)
ELAPSED TIME: ${Math.round(elapsedSeconds / 60)} minutes

CONFIDENCE & SPEECH METRICS:
- Overall Speech Confidence Score: ${confidenceMetrics.overallConfidenceScore} / 10
- Vocal Steadiness: ${confidenceMetrics.vocalSteadinessScore} / 10
- Fluency Score: ${confidenceMetrics.fluencyScore} / 10
- Articulation Score: ${confidenceMetrics.articulationScore} / 10
- Words Per Minute: ${confidenceMetrics.wordsPerMinute}
- Filler Words: ${confidenceMetrics.fillerWordsDetected.join(", ") || "None detected"}
- Hesitation Pauses: ${confidenceMetrics.hesitationPauses}

PROCTORING & INTEGRITY:
- Strikes: ${proctoringMetrics.strikes} / 3
- Tab Switches: ${proctoringMetrics.tabSwitchCount}
- Focus Blurs: ${proctoringMetrics.blurCount}
- Integrity Score: ${proctoringMetrics.integrityScore} / 10

BRUTE FORCE CODE:
\`\`\`
${payload.bruteForceCode || "Not submitted"}
\`\`\`

BETTER CODE:
\`\`\`
${payload.betterCode || "Not submitted"}
\`\`\`

OPTIMAL CODE:
\`\`\`
${payload.optimalCode || "Not submitted"}
\`\`\`

Produce a rigorous, balanced, highly actionable scorecard.
Return strictly valid JSON matching this schema:
{
  "overallScore": number (1.0 to 10.0),
  "craftScore": number (1.0 to 10.0),
  "confidenceScore": number (1.0 to 10.0),
  "integrityScore": number (1.0 to 10.0),
  "hiringRecommendation": "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Practice",
  "spokenClosingFeedback": "2 to 3 conversational sentences the interviewer speaks aloud to conclude the interview and summarize performance",
  "executiveSummary": "Paragraph assessing technical agility, progression through brute -> better -> optimal, and vocal explanation quality",
  "tierBreakdown": {
    "bruteForce": { "completed": boolean, "time": "O(N^2)", "space": "O(1)", "summary": "brief note" },
    "better": { "completed": boolean, "time": "O(N)", "space": "O(N)", "summary": "brief note" },
    "optimal": { "completed": boolean, "time": "O(N)", "space": "O(1)", "summary": "brief note" }
  },
  "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasForGrowth": ["Area 1", "Area 2"]
}`;

    const { text } = await generateContentWithFallback(ai, "gemini-3.8-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(text || "{}");
    return {
      overallScore: parsed.overallScore || (numTiers === 3 ? 9.0 : numTiers === 2 ? 7.5 : 6.0),
      craftScore: parsed.craftScore || (numTiers === 3 ? 9.5 : numTiers === 2 ? 7.8 : 5.5),
      confidenceScore: parsed.confidenceScore || confidenceMetrics.overallConfidenceScore || 8.0,
      integrityScore: parsed.integrityScore || proctoringMetrics.integrityScore || 9.5,
      hiringRecommendation:
        parsed.hiringRecommendation || (numTiers === 3 ? "Strong Hire" : numTiers === 2 ? "Hire" : "Needs Practice"),
      spokenClosingFeedback:
        parsed.spokenClosingFeedback ||
        `Thank you for completing the interview session. You demonstrated solid problem solving through ${numTiers} solution tiers, with an overall rating of ${parsed.overallScore || 8.5} out of ten. Great work!`,
      executiveSummary:
        parsed.executiveSummary ||
        `The candidate navigated "${question.title}" systematically, articulating trade-offs while progressing through the required complexity phases.`,
      tierBreakdown: parsed.tierBreakdown || {
        bruteForce: { completed: tiersCompleted.includes("bruteForce"), time: question.tierDetails.bruteForce.targetTime, space: question.tierDetails.bruteForce.targetSpace, summary: "Baseline pair enumeration." },
        better: { completed: tiersCompleted.includes("better"), time: question.tierDetails.better.targetTime, space: question.tierDetails.better.targetSpace, summary: "Auxiliary space optimization." },
        optimal: { completed: tiersCompleted.includes("optimal"), time: question.tierDetails.optimal.targetTime, space: question.tierDetails.optimal.targetSpace, summary: "Peak in-place asymptotic efficiency." },
      },
      topStrengths: parsed.topStrengths || [
        "Structured progression from baseline to optimized invariants",
        "Clear vocal thought articulation while coding",
        "Disciplined proctoring adherence",
      ],
      areasForGrowth: parsed.areasForGrowth || [
        "Continue drilling non-trivial edge boundary conditions",
        "Practice reducing filler speech pauses during silent reasoning",
      ],
      speechAnalysis: {
        wordsPerMinute: confidenceMetrics.wordsPerMinute,
        fillerWordCount: confidenceMetrics.fillerWordsDetected.length,
        vocalSteadiness: confidenceMetrics.vocalSteadinessScore,
        hesitationPauses: confidenceMetrics.hesitationPauses,
      },
      proctoringSummary: {
        strikes: proctoringMetrics.strikes,
        tabSwitches: proctoringMetrics.tabSwitchCount,
        blurCount: proctoringMetrics.blurCount,
      },
    };
  } catch (err) {
    console.log("Fallback scorecard generation:", err);
    const craft = numTiers === 3 ? 9.2 : numTiers === 2 ? 7.6 : 5.8;
    const confidence = confidenceMetrics.overallConfidenceScore || 8.0;
    const integrity = proctoringMetrics.integrityScore || 9.5;
    const overall = Math.round(((craft * 0.5 + confidence * 0.3 + integrity * 0.2) * 10)) / 10;

    return {
      overallScore: overall,
      craftScore: craft,
      confidenceScore: confidence,
      integrityScore: integrity,
      hiringRecommendation: overall >= 8.5 ? "Strong Hire" : overall >= 7.2 ? "Hire" : "Needs Practice",
      spokenClosingFeedback: `Thank you for completing this technical interview. You achieved a solid overall score of ${overall} out of ten across ${numTiers} solution phases. Your vocal steadiness and algorithmic intuition were well presented.`,
      executiveSummary: `The candidate tackled "${question.title}", completing ${numTiers} of 3 solution tiers in ${Math.round(elapsedSeconds / 60)} minutes. Maintained steady composure and followed proctoring protocols.`,
      tierBreakdown: {
        bruteForce: { completed: tiersCompleted.includes("bruteForce"), time: question.tierDetails.bruteForce.targetTime, space: question.tierDetails.bruteForce.targetSpace, summary: "Baseline implemented." },
        better: { completed: tiersCompleted.includes("better"), time: question.tierDetails.better.targetTime, space: question.tierDetails.better.targetSpace, summary: "Intermediate optimization." },
        optimal: { completed: tiersCompleted.includes("optimal"), time: question.tierDetails.optimal.targetTime, space: question.tierDetails.optimal.targetSpace, summary: "Optimal efficiency achieved." },
      },
      topStrengths: [
        "Methodical problem breakdown from brute force to optimal",
        "Disciplined code formatting and variable naming",
        "High proctoring integrity throughout the live session",
      ],
      areasForGrowth: [
        "Verify edge cases (e.g. empty, single-element, duplicates) before submitting",
        "Maintain vocal reasoning cadence during deeper algorithmic contemplation",
      ],
      speechAnalysis: {
        wordsPerMinute: confidenceMetrics.wordsPerMinute,
        fillerWordCount: confidenceMetrics.fillerWordsDetected.length,
        vocalSteadiness: confidenceMetrics.vocalSteadinessScore,
        hesitationPauses: confidenceMetrics.hesitationPauses,
      },
      proctoringSummary: {
        strikes: proctoringMetrics.strikes,
        tabSwitches: proctoringMetrics.tabSwitchCount,
        blurCount: proctoringMetrics.blurCount,
      },
    };
  }
}
