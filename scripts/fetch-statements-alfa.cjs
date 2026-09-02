const fs = require('fs');
const problems = require('../src/data/problems.json');
const existing = require('../src/data/statements.json');

const BATCH_SIZE = 10;
const DELAY_MS = 1000;

async function fetchStatement(slug) {
  try {
    const mirrorRes = await fetch(
      `https://alfa-leetcode-api.onrender.com/select?titleSlug=${encodeURIComponent(slug)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (mirrorRes.ok) {
      const mirrorData = await mirrorRes.json();
      const q = mirrorData?.question || mirrorData?.questionContent || mirrorData?.data?.question?.content;
      if (q && typeof q === "string" && q.trim().length > 0) {
        return q;
      }
    }
  } catch (e) {
    // console.log("Failed", slug);
  }
  return null;
}

async function run() {
  const missing = problems.filter(p => !existing[p.slug] && !existing[p.slug.replace(/-/g, '_')]);
  console.log(`Found ${missing.length} missing statements. Starting fetch...`);
  
  let added = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (p) => {
      const content = await fetchStatement(p.slug);
      if (content) {
        existing[p.slug] = content;
        added++;
      }
    });
    
    await Promise.all(promises);
    console.log(`Processed ${i + batch.length}/${missing.length}. Added so far: ${added}`);
    
    fs.writeFileSync('./src/data/statements.json', JSON.stringify(existing, null, 2));
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  
  console.log(`Done! Added ${added} new statements.`);
}

run();
