import { adminDb } from '../lib/firebase-admin.ts';

export async function getSubmissions(userId: string) {
  const snapshot = await adminDb.collection('users').doc(userId).collection('submissions')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  return snapshot.docs.map(doc => {
    const r = doc.data();
    return {
      id: doc.id,
      userId: userId,
      slug: r.slug,
      title: r.title || r.slug,
      code: r.code,
      pseudocode: r.pseudocode || r.code,
      lang: r.lang || "pseudocode",
      classification: r.classification,
      difficulty: r.difficulty,
      timeTakenMs: r.timeTakenMs,
      timeComplexity: r.timeComplexity,
      spaceComplexity: r.spaceComplexity,
      time_complexity: r.timeComplexity,
      space_complexity: r.spaceComplexity,
      praise: r.praise,
      nudge: r.nudge,
      review: r.review,
      viz_steps: r.vizSteps,
      test_case: r.testCase,
      code_lines: r.codeLines,
      created_at: r.createdAt || new Date().toISOString(),
      createdAt: r.createdAt || new Date().toISOString(),
    };
  });
}

export async function addSubmission(userId: string, data: any) {
  const code = data.code || data.pseudocode || "";
  const pseudocode = data.pseudocode || data.code || "";
  const lang = data.lang || "pseudocode";
  const classification = data.classification || "Incomplete";
  const difficulty = data.difficulty || "Medium";
  const timeComplexity = data.timeComplexity || data.time_complexity || null;
  const spaceComplexity = data.spaceComplexity || data.space_complexity || null;
  const timeTakenMs = data.timeTakenMs || data.time_taken_ms || null;

  const newSub = {
    slug: data.slug,
    title: data.title || null,
    code,
    pseudocode,
    lang,
    classification,
    difficulty,
    timeTakenMs,
    timeComplexity,
    spaceComplexity,
    review: data.review || null,
    praise: data.praise || null,
    nudge: data.nudge || null,
    vizSteps: data.viz_steps || data.vizSteps || null,
    testCase: data.test_case || data.testCase || null,
    codeLines: data.code_lines || data.codeLines || null,
    createdAt: new Date().toISOString(),
  };

  const docRef = await adminDb.collection('users').doc(userId).collection('submissions').add(newSub);
  const doc = await docRef.get();
  const r = doc.data() as any;

  return {
    ...r,
    id: doc.id,
    userId: userId,
    title: r.title || r.slug,
    pseudocode: r.pseudocode || r.code,
    time_complexity: r.timeComplexity,
    space_complexity: r.spaceComplexity,
    viz_steps: r.vizSteps,
    test_case: r.testCase,
    code_lines: r.codeLines,
    created_at: r.createdAt || new Date().toISOString(),
  };
}

export async function deleteSubmission(userId: string, id: string) {
  await adminDb.collection('users').doc(userId).collection('submissions').doc(id).delete();
}
