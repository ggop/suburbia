import { SuburbData, CityId } from '../types';
import { findShortestPath, getDistancesFrom, CityMapModel } from './mapGeometry';
import { CANONICAL_DAILY_CHALLENGES } from '../data/canonicalDailyChallenges';
import { CANONICAL_SYDNEY_DAILY_CHALLENGES } from '../data/canonicalSydneyDailyChallenges';
import { CANONICAL_ADELAIDE_DAILY_CHALLENGES } from '../data/canonicalAdelaideDailyChallenges';
import { CANONICAL_CHENNAI_DAILY_CHALLENGES } from '../data/canonicalChennaiDailyChallenges';

/**
 * Deterministic hash function (xmur3) for string date seeds
 */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random number generator for a specific date string and city
 */
export function getSeededRandom(dateStr: string, cityId: CityId = 'melbourne'): () => number {
  const seedGen = xmur3(`${cityId}-traverse-daily-${dateStr}`);
  return mulberry32(seedGen());
}

/**
 * Get current date string in YYYY-MM-DD local format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Human-friendly date representation (e.g. "Sat, 5 Sep 2026")
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Day number relative to epoch 2026-01-01
 */
export function getDailyChallengeNumber(dateStr: string): number {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const epoch = new Date(2026, 0, 1);
    const diffTime = date.getTime() - epoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}

export interface DailyChallengeGame {
  dateStr: string;
  challengeNumber: number;
  startSuburbId: string;
  targetSuburbId: string;
  bestPath: string[];
  bestPathDistance: number;
  maxTurns: number;
}

/**
 * Deterministically generate the Daily Challenge for all players worldwide.
 * Guarantees:
 * 1. Shortest path is strictly 5 steps.
 * 2. Allowed turns is strictly 10.
 * 3. Identical start & target suburbs for all players on this date.
 */
export function generateDailyChallenge(
  suburbs: SuburbData[],
  adjacency: Map<string, string[]>,
  dateStr: string = getTodayDateString(),
  cityId: CityId = 'melbourne'
): DailyChallengeGame {
  const challengeNumber = getDailyChallengeNumber(dateStr);

  const canonicalMap =
    cityId === 'sydney'
      ? CANONICAL_SYDNEY_DAILY_CHALLENGES
      : cityId === 'adelaide'
      ? CANONICAL_ADELAIDE_DAILY_CHALLENGES
      : cityId === 'chennai'
      ? CANONICAL_CHENNAI_DAILY_CHALLENGES
      : CANONICAL_DAILY_CHALLENGES;

  // 1. Immutable Canonical Schedule:
  // Guarantees the daily challenge for any date NEVER changes across deployments,
  // runtime environments, or code updates on any given day.
  if (canonicalMap && canonicalMap[dateStr]) {
    const [startId, targetId] = canonicalMap[dateStr];
    const bestPath = findShortestPath(startId, targetId, adjacency);
    return {
      dateStr,
      challengeNumber,
      startSuburbId: startId,
      targetSuburbId: targetId,
      bestPath,
      bestPathDistance: Math.max(1, bestPath.length - 2),
      maxTurns: 10,
    };
  }

  // 2. Deterministic PRNG fallback for unlisted dates
  const rng = getSeededRandom(dateStr, cityId);

  // Sort suburbs deterministically so index ordering never varies between runtimes
  const sortedSuburbs = [...suburbs].sort((a, b) => a.id.localeCompare(b.id));
  const allIds = sortedSuburbs.map((s) => s.id);

  // Sample candidate starts using our PRNG to find a pair strictly 5 steps away
  for (let attempt = 0; attempt < 500; attempt++) {
    const startIndex = Math.floor(rng() * allIds.length);
    const startId = allIds[startIndex];
    const distances = getDistancesFrom(startId, adjacency);

    // Collect valid candidate targets strictly 5 steps away
    const validTargets: { id: string; dist: number }[] = [];
    allIds.forEach((targetId) => {
      if (targetId !== startId) {
        const dist = distances.get(targetId);
        if (dist === 5) {
          validTargets.push({ id: targetId, dist });
        }
      }
    });

    if (validTargets.length > 0) {
      // Deterministically sort targets and pick one using rng
      validTargets.sort((a, b) => a.id.localeCompare(b.id));
      const targetIndex = Math.floor(rng() * validTargets.length);
      const chosen = validTargets[targetIndex];
      const bestPath = findShortestPath(startId, chosen.id, adjacency);

      return {
        dateStr,
        challengeNumber,
        startSuburbId: startId,
        targetSuburbId: chosen.id,
        bestPath,
        bestPathDistance: Math.max(1, bestPath.length - 2),
        maxTurns: 10,
      };
    }
  }

  // Deterministic fallback (5 steps)
  const startId =
    cityId === 'sydney'
      ? 'sydney'
      : cityId === 'chennai'
      ? 't-nagar'
      : cityId === 'adelaide'
      ? 'adelaide-cbd'
      : 'melbourne-cbd';
  const targetId =
    cityId === 'sydney'
      ? 'bondi-beach'
      : cityId === 'chennai'
      ? 'besant-nagar'
      : cityId === 'adelaide'
      ? 'glenelg'
      : 'box-hill';
  const bestPath = findShortestPath(startId, targetId, adjacency);

  return {
    dateStr,
    challengeNumber,
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: Math.max(1, bestPath.length - 2),
    maxTurns: 10,
  };
}

export interface DailyResultData {
  dateStr: string;
  challengeNumber: number;
  status: 'won' | 'lost';
  turnsUsed: number;
  maxTurns: number;
  path: string[];
  bestPath: string[];
  bestPathDistance: number;
  startSuburbId: string;
  targetSuburbId: string;
}

/**
 * Generate Wordle-like shareable text
 */
export function generateDailyShareText(
  result: DailyResultData,
  mapModel: CityMapModel,
  isDaily: boolean = true
): string {
  const startName = mapModel.suburbMap.get(result.startSuburbId)?.name || 'Start';
  const targetName = mapModel.suburbMap.get(result.targetSuburbId)?.name || 'Target';
  const displayDate = formatDisplayDate(result.dateStr);
  const cityName = mapModel.cityName || 'City';

  const isWon = result.status === 'won';
  const optimalSteps = Math.max(1, result.bestPath.length - 2);
  // Do not count the start suburb in navigated suburb count
  const suburbsCount = Math.max(0, result.path.length - 1);
  const suburbWord = suburbsCount === 1 ? 'suburb' : 'suburbs';
  const turnWord = result.turnsUsed === 1 ? 'turn' : 'turns';

  // Turn accuracy tier badge
  const turnDiff = result.turnsUsed - optimalSteps;
  let ratingEmoji = '🎯';
  let tierBadge = '';
  if (isWon) {
    if (turnDiff === 0) {
      ratingEmoji = '🏆';
      tierBadge = ' [Gold]';
    } else if (turnDiff <= 2) {
      ratingEmoji = '🥈';
      tierBadge = ' [Silver]';
    } else {
      ratingEmoji = '🥉';
      tierBadge = ' [Bronze]';
    }
  }

  // Visual emoji trail representing the path
  let trail = '🚩';
  for (let i = 1; i < result.path.length - 1; i++) {
    const isOptimal = result.bestPath.includes(result.path[i]);
    trail += isOptimal ? '🟩' : '🟨';
  }
  trail += isWon ? '🏁' : '❌';

  const modeLine = isDaily
    ? `Daily (${displayDate})`
    : `Practice`;

  const playLabel = isDaily ? "Play today's daily" : 'Play Suburbia';
  const playUrl = `${window.location.origin}${window.location.pathname}`;

  // Compact summary without "Turn limit reached [Turn Limit Exceeded]"
  const lines: string[] = [
    `Suburbia 🗺️ ${cityName} • ${modeLine}`,
    `📍 ${startName} ➔ ${targetName}`,
  ];

  if (isWon) {
    lines.push(`${ratingEmoji} Solved in ${result.turnsUsed} ${turnWord} (${suburbsCount} ${suburbWord})${tierBadge}`);
  } else {
    lines.push(`🛣️ ${suburbsCount} ${suburbWord} (${result.turnsUsed} ${turnWord})`);
  }

  lines.push(trail);
  lines.push(`${playLabel}: ${playUrl}`);

  return lines.join('\n');
}
