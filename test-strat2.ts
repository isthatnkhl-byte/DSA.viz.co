import { fetchLeetCodeStats } from './src/lib/leetcode-service';
// Temporarily mock fetch to fail for Strategy 1
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (typeof url === 'string' && url.includes('faisalshohag')) {
    throw new Error('Simulated failure');
  }
  return originalFetch(url, options);
}

fetchLeetCodeStats('neetcode').then(res => console.log("Strat2 Result: ", res ? Object.keys(res) : null)).catch(console.error);
