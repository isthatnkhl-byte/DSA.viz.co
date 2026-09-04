import { fetchLeetCodeStats } from './src/lib/leetcode-service';
fetchLeetCodeStats('tourist').then(res => console.log("Result: ", res)).catch(console.error);
