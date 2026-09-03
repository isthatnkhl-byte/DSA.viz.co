import { fetchLeetCodeStats } from './src/lib/leetcode-service';

fetchLeetCodeStats('neetcode').then(res => console.log("Result: ", res ? Object.keys(res) : null)).catch(console.error);
