export interface LeetCodeRecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: string | number;
  statusDisplay: string;
  lang: string;
}

export interface LeetCodeStats {
  username: string;
  name: string;
  avatar: string;
  ranking: number;
  reputation: number;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  totalEasy: number;
  mediumSolved: number;
  totalMedium: number;
  hardSolved: number;
  totalHard: number;
  acceptanceRate: number;
  submissionCalendar: Record<string, number>;
  totalActiveDays: number;
  streak: number;
  recentSubmissions: LeetCodeRecentSubmission[];
  lastSyncedAt: string;
}

export function computeStreakFromCalendar(calendar: Record<string, number>): number {
  if (!calendar || typeof calendar !== 'object') return 0;
  const ONE_DAY = 86400;
  const timestamps = Object.keys(calendar)
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a);

  if (timestamps.length === 0) return 0;

  const nowTs = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor(nowTs / ONE_DAY) * ONE_DAY;

  let computedStreak = 0;
  // If the most recent active day is today or yesterday
  const firstTs = timestamps[0];
  if (firstTs !== undefined && firstTs >= todayStart - ONE_DAY * 2) {
    let currentExpected: number = firstTs;
    for (const t of timestamps) {
      if (t === currentExpected) {
        computedStreak++;
        currentExpected -= ONE_DAY;
      } else if (t < currentExpected) {
        // Break in streak
        break;
      }
    }
  }

  return computedStreak;
}

export function parseCalendarStringOrObject(rawCal: any): Record<string, number> {
  const parsed: Record<string, number> = {};
  if (!rawCal) return parsed;
  if (typeof rawCal === 'string') {
    try {
      const obj = JSON.parse(rawCal);
      if (obj && typeof obj === 'object') {
        Object.assign(parsed, obj);
      }
    } catch {}
  } else if (typeof rawCal === 'object') {
    Object.assign(parsed, rawCal);
  }
  return parsed;
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats | null> {
  const cleanUsername = username.trim().replace(/^@+/, '');
  if (!cleanUsername) return null;

  // Strategy 1: Faisal Shohag LeetCode Vercel API (Super fast & reliable, full details)
  try {
    const res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${cleanUsername}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.errors && data.totalSolved !== undefined) {
        const cal = parseCalendarStringOrObject(data.submissionCalendar);
        const streak = computeStreakFromCalendar(cal);
        const recentSubmissions: LeetCodeRecentSubmission[] = Array.isArray(data.recentSubmissions)
          ? data.recentSubmissions.slice(0, 15).map((s: any) => ({
              title: s.title || '',
              titleSlug: s.titleSlug || '',
              timestamp: s.timestamp || '',
              statusDisplay: s.statusDisplay || 'Accepted',
              lang: s.lang || 'cpp',
            }))
          : [];

        return {
          username: cleanUsername,
          name: cleanUsername,
          avatar: `https://assets.leetcode.com/users/${cleanUsername}/avatar_1775999706.png`,
          ranking: Number(data.ranking) || 0,
          reputation: Number(data.reputation) || 0,
          totalSolved: Number(data.totalSolved) || 0,
          totalQuestions: Number(data.totalQuestions) || 4000,
          easySolved: Number(data.easySolved) || 0,
          totalEasy: Number(data.totalEasy) || 950,
          mediumSolved: Number(data.mediumSolved) || 0,
          totalMedium: Number(data.totalMedium) || 2100,
          hardSolved: Number(data.hardSolved) || 0,
          totalHard: Number(data.totalHard) || 950,
          acceptanceRate: 0,
          submissionCalendar: cal,
          totalActiveDays: Object.keys(cal).length,
          streak,
          recentSubmissions,
          lastSyncedAt: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn('[LeetCode Fetcher] Strategy 1 failed, trying fallback:', e);
  }

  // Strategy 2: Official GraphQL
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userAvatar
            ranking
            reputation
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          submissionCalendar
        }
        allQuestionsCount {
          difficulty
          count
        }
        recentSubmissionList(username: $username, limit: 15) {
          title
          titleSlug
          timestamp
          statusDisplay
          lang
        }
      }
    `;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
      },
      body: JSON.stringify({ query, variables: { username: cleanUsername } }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const matched = data?.data?.matchedUser;
      if (matched) {
        const cal = parseCalendarStringOrObject(matched.submissionCalendar);
        const streak = computeStreakFromCalendar(cal);

        const ac = matched.submitStats?.acSubmissionNum || [];
        const totalSolved = ac.find((x: any) => x.difficulty === 'All')?.count || 0;
        const easySolved = ac.find((x: any) => x.difficulty === 'Easy')?.count || 0;
        const mediumSolved = ac.find((x: any) => x.difficulty === 'Medium')?.count || 0;
        const hardSolved = ac.find((x: any) => x.difficulty === 'Hard')?.count || 0;

        const allQ = data?.data?.allQuestionsCount || [];
        const totalQuestions = allQ.find((x: any) => x.difficulty === 'All')?.count || 3300;
        const totalEasy = allQ.find((x: any) => x.difficulty === 'Easy')?.count || 850;
        const totalMedium = allQ.find((x: any) => x.difficulty === 'Medium')?.count || 1750;
        const totalHard = allQ.find((x: any) => x.difficulty === 'Hard')?.count || 750;

        const recentSubmissions = (data?.data?.recentSubmissionList || []).map((s: any) => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp,
          statusDisplay: s.statusDisplay,
          lang: s.lang,
        }));

        return {
          username: matched.username || cleanUsername,
          name: matched.profile?.realName || matched.username || cleanUsername,
          avatar: matched.profile?.userAvatar || `https://assets.leetcode.com/users/${cleanUsername}/avatar.png`,
          ranking: matched.profile?.ranking || 0,
          reputation: matched.profile?.reputation || 0,
          totalSolved,
          totalQuestions,
          easySolved,
          totalEasy,
          mediumSolved,
          totalMedium,
          hardSolved,
          totalHard,
          acceptanceRate: 0,
          submissionCalendar: cal,
          totalActiveDays: Object.keys(cal).length,
          streak,
          recentSubmissions,
          lastSyncedAt: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn('[LeetCode Fetcher] Strategy 2 (GQL) failed, trying fallback:', e);
  }

  // Strategy 3: Alfa LeetCode API
  try {
    const [userRes, calRes] = await Promise.allSettled([
      fetch(`https://alfa-leetcode-api.onrender.com/${cleanUsername}`, { signal: AbortSignal.timeout(5000) }),
      fetch(`https://alfa-leetcode-api.onrender.com/${cleanUsername}/calendar`, { signal: AbortSignal.timeout(5000) }),
    ]);

    let userJson: any = null;
    let calJson: any = null;

    if (userRes.status === 'fulfilled' && userRes.value.ok) {
      userJson = await userRes.value.json().catch(() => null);
    }
    if (calRes.status === 'fulfilled' && calRes.value.ok) {
      calJson = await calRes.value.json().catch(() => null);
    }

    if (userJson && !userJson.errors && userJson.username) {
      const cal = parseCalendarStringOrObject(calJson?.submissionCalendar);
      const streak = calJson?.streak ?? computeStreakFromCalendar(cal);

      return {
        username: userJson.username || cleanUsername,
        name: userJson.name || cleanUsername,
        avatar: userJson.avatar || `https://assets.leetcode.com/users/${cleanUsername}/avatar.png`,
        ranking: Number(userJson.ranking) || 0,
        reputation: Number(userJson.reputation) || 0,
        totalSolved: Number(userJson.totalSolved) || 0,
        totalQuestions: 3300,
        easySolved: Number(userJson.easySolved) || 0,
        totalEasy: 850,
        mediumSolved: Number(userJson.mediumSolved) || 0,
        totalMedium: 1750,
        hardSolved: Number(userJson.hardSolved) || 0,
        totalHard: 750,
        acceptanceRate: 0,
        submissionCalendar: cal,
        totalActiveDays: calJson?.totalActiveDays || Object.keys(cal).length,
        streak,
        recentSubmissions: [],
        lastSyncedAt: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[LeetCode Fetcher] Strategy 3 failed:', e);
  }

  return null;
}
