const fs = require('fs');
const problems = require('../src/data/problems.json');
const existing = require('../src/data/statements.json');

const BATCH_SIZE = 1;
const DELAY_MS = 2000;

async function fetchStatement(slug) {
  try {
    const leetRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        query: `query questionContent($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            content
          }
        }`,
        variables: { titleSlug: slug },
      })
    });
    
    if (leetRes.ok) {
      const json = await leetRes.json();
      if (json?.data?.question?.content) {
        return json.data.question.content;
      }
    } else {
        console.log("Leetcode HTTP Error", leetRes.status);
    }
  } catch (e) {
    console.log("Failed", slug, e.message);
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
