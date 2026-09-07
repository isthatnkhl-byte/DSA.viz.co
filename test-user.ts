import { fetchLeetCodeStats } from './src/lib/leetcode-service';
fetchLeetCodeStats('nikhilggoswami5380').then(res => console.log("Result: ", res)).catch(console.error);
