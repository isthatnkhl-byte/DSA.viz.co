// scripts/build-authentic-company-tags.js
const fs = require("fs");
const path = require("path");

function normalizeCompanySlug(rawName) {
  let name = rawName
    .replace(/^companies\//i, "")
    .replace(/\.csv$/i, "")
    .replace(/\/5\.\s*All$/i, "")
    .replace(/\/all$/i, "")
    .trim()
    .toLowerCase();

  // Normalize aliases
  const aliases = {
    facebook: "meta",
    fb: "meta",
    meta: "meta",
    "google-inc": "google",
    "amazon-com": "amazon",
    "microsoft-corporation": "microsoft",
    "apple-inc": "apple",
    "bytedance-tiktok": "tiktok",
    "byte-dance": "bytedance",
    "goldman-sachs-group": "goldman-sachs",
    "morgan-stanley-wealth-management": "morgan-stanley",
    "de-shaw-group": "de-shaw",
    "walmart-labs": "walmart",
    "walmart-global-tech": "walmart",
    "booking-com": "booking-com",
    "bookingcom": "booking-com",
    "arista-networks": "arista-networks",
    "palo-alto-networks": "palo-alto-networks",
    "two-sigma-investments": "two-sigma",
    "jane-street-capital": "jane-street",
    "bloomberg-lp": "bloomberg",
  };

  // Convert non-alphanumeric to hyphens
  let slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (aliases[slug]) slug = aliases[slug];
  return slug;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function main() {
  console.log("=== Fetching Authentic LeetCode Company Datasets ===");

  // Inverted index: slug -> { companyStats: Map<company, { freq: number, source: string }>, titles: Set<string> }
  const slugIndex = new Map();

  function record(slug, company, freq, source) {
    if (!slug || !company) return;
    const cleanSlug = slug.toLowerCase().trim().replace(/\/+$/, "");
    const compSlug = normalizeCompanySlug(company);
    if (!compSlug) return;

    if (!slugIndex.has(cleanSlug)) {
      slugIndex.set(cleanSlug, {
        companies: new Map(),
      });
    }
    const item = slugIndex.get(cleanSlug);
    const prev = item.companies.get(compSlug);
    if (!prev || freq > prev.freq) {
      item.companies.set(compSlug, { freq: freq || 10, source });
    }
  }

  // 1. Primary Source: snehasishroy/leetcode-companywise-interview-questions (656 companies, updated 2025/2026)
  console.log("Loading snehasishroy company repo tree...");
  try {
    const tree1 = await fetchJson("https://api.github.com/repos/snehasishroy/leetcode-companywise-interview-questions/git/trees/master?recursive=1");
    const allCsvs1 = (tree1.tree || []).filter(x => x.path.endsWith("/all.csv"));
    console.log(`Found ${allCsvs1.length} company all.csv files in primary repo.`);

    const batchSize = 25;
    for (let i = 0; i < allCsvs1.length; i += batchSize) {
      const batch = allCsvs1.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        const companyRaw = item.path.split("/")[0];
        const url = `https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/${item.path}`;
        try {
          const text = await fetchText(url);
          const lines = text.split("\n");
          for (let l = 1; l < lines.length; l++) {
            const line = lines[l].trim();
            if (!line) continue;
            const match = line.match(/https:\/\/leetcode\.com\/problems\/([^/,\s]+)/i);
            if (match) {
              const slug = match[1];
              const parts = line.split(",");
              const last = parts[parts.length - 1];
              const freq = parseFloat(last) || 10;
              record(slug, companyRaw, freq, "snehasishroy");
            }
          }
        } catch (e) {
          // ignore individual missing files
        }
      }));
    }
    console.log(`Indexed primary source. Total unique problems: ${slugIndex.size}`);
  } catch (err) {
    console.error("Primary source error:", err.message);
  }

  // 2. Secondary Source: liquidslr/leetcode-company-wise-problems (2025 updated)
  console.log("Loading liquidslr company repo tree...");
  try {
    const tree2 = await fetchJson("https://api.github.com/repos/liquidslr/leetcode-company-wise-problems/git/trees/main?recursive=1");
    const allCsvs2 = (tree2.tree || []).filter(x => x.path.endsWith("/5. All.csv") || x.path.endsWith("/all.csv"));
    console.log(`Found ${allCsvs2.length} company CSVs in secondary repo.`);

    const batchSize = 25;
    for (let i = 0; i < allCsvs2.length; i += batchSize) {
      const batch = allCsvs2.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        const companyRaw = item.path.split("/")[0];
        const url = `https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main/${encodeURIComponent(item.path).replace(/%2F/g, "/")}`;
        try {
          const text = await fetchText(url);
          const lines = text.split("\n");
          for (let l = 1; l < lines.length; l++) {
            const line = lines[l].trim();
            if (!line) continue;
            const match = line.match(/https:\/\/leetcode\.com\/problems\/([^/,\s]+)/i);
            if (match) {
              const slug = match[1];
              const parts = line.split(",");
              const last = parts[parts.length - 1];
              const freq = parseFloat(last) || 10;
              record(slug, companyRaw, freq, "liquidslr");
            }
          }
        } catch (e) {
          // ignore
        }
      }));
    }
    console.log(`Indexed secondary source. Total unique problems: ${slugIndex.size}`);
  } catch (err) {
    console.error("Secondary source error:", err.message);
  }

  // 3. Load existing problems.json
  const problemsPath = path.join(process.cwd(), "src/data/problems.json");
  const existingProblems = JSON.parse(fs.readFileSync(problemsPath, "utf8"));
  console.log(`Loaded ${existingProblems.length} existing problems from problems.json`);

  let verifiedCount = 0;
  let unverifiedCount = 0;

  // Weightings for top tier companies to determine accurate overall frequency
  const tierWeights = {
    google: 1.0,
    meta: 1.0,
    amazon: 1.0,
    microsoft: 0.9,
    apple: 0.85,
    netflix: 0.85,
    uber: 0.8,
    bloomberg: 0.8,
    tiktok: 0.8,
    bytedance: 0.8,
    stripe: 0.75,
    openai: 0.75,
    databricks: 0.75,
    snowflake: 0.7,
    citadel: 0.7,
    "two-sigma": 0.7,
    "jane-street": 0.7,
    adobe: 0.7,
    salesforce: 0.7,
    linkedin: 0.7,
    nvidia: 0.7,
    "goldman-sachs": 0.7,
  };

  const updatedProblems = existingProblems.map((p) => {
    const slug = p.slug.toLowerCase().trim();
    const entry = slugIndex.get(slug);

    if (entry && entry.companies.size > 0) {
      verifiedCount++;
      // Sort companies by frequency desc, tier relevance
      const sortedCompanies = Array.from(entry.companies.entries())
        .sort((a, b) => {
          const scoreA = (a[1].freq || 10) * (tierWeights[a[0]] || 0.5);
          const scoreB = (b[1].freq || 10) * (tierWeights[b[0]] || 0.5);
          return scoreB - scoreA;
        })
        .map(([comp]) => comp);

      // Compute authentic frequency score (0-100) based on real occurrences and rates
      let calculatedFreq = 20;
      const topFreqs = Array.from(entry.companies.values()).map(v => v.freq);
      const maxFreq = Math.max(...topFreqs, 10);
      const companyCount = entry.companies.size;
      calculatedFreq = Math.min(99, Math.max(15, Math.round(maxFreq * 0.6 + Math.min(40, companyCount * 3))));

      return {
        ...p,
        companies: sortedCompanies.slice(0, 10), // Top authentic companies asked at
        freq: calculatedFreq,
      };
    } else {
      unverifiedCount++;
      // For problems not explicitly in top company question banks (e.g. contest / niche problems),
      // do NOT guess! Tag them as "general-algorithms" / "academic" so users see verified truth.
      return {
        ...p,
        companies: ["general-algorithms"],
        freq: Math.max(10, Math.min(40, p.freq || 25)),
      };
    }
  });

  console.log(`\nVerification Summary:`);
  console.log(`- Total Problems: ${updatedProblems.length}`);
  console.log(`- Verified with Authentic Company Sources: ${verifiedCount} (${(verifiedCount/updatedProblems.length*100).toFixed(1)}%)`);
  console.log(`- Tagged as General Algorithms (Not explicitly in company banks): ${unverifiedCount}`);

  // Write updated problems.json
  fs.writeFileSync(problemsPath, JSON.stringify(updatedProblems, null, 2), "utf8");
  console.log(`Successfully updated ${problemsPath} with verified company tags!`);
}

main().catch(console.error);
