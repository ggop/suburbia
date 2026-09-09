import { SuburbData } from '../types';
import { findShortestPath, getDistancesFrom, MelbourneMapModel } from './mapGeometry';

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
 * Create a seeded random number generator for a specific date string (YYYY-MM-DD)
 */
export function getSeededRandom(dateStr: string): () => number {
  const seedGen = xmur3(`melbourne-traverse-daily-${dateStr}`);
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
  dateStr: string = getTodayDateString()
): DailyChallengeGame {
  const rng = getSeededRandom(dateStr);
  const challengeNumber = getDailyChallengeNumber(dateStr);

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
        bestPathDistance: 5,
        maxTurns: 10,
      };
    }
  }

  // Deterministic fallback (5 steps)
  const startId = 'melbourne-cbd';
  const targetId = 'box-hill';
  const bestPath = findShortestPath(startId, targetId, adjacency);

  return {
    dateStr,
    challengeNumber,
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: 5,
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
  mapModel: MelbourneMapModel
): string {
  const startName = mapModel.suburbMap.get(result.startSuburbId)?.name || 'Start';
  const targetName = mapModel.suburbMap.get(result.targetSuburbId)?.name || 'Target';
  const displayDate = formatDisplayDate(result.dateStr);

  const isWon = result.status === 'won';
  const optimalSteps = result.bestPathDistance;
  const pathLength = result.path.length;
  const optimalSuburbs = optimalSteps + 1;

  // Turn accuracy badge
  const turnDiff = result.turnsUsed - optimalSteps;
  let ratingEmoji = '🎯';
  let ratingText = '';
  if (isWon) {
    if (turnDiff === 0) {
      ratingEmoji = '🏆';
      ratingText = 'Perfect Route! (Gold)';
    } else if (turnDiff <= 2) {
      ratingEmoji = '🥈';
      ratingText = 'Near-Optimal! (Silver)';
    } else {
      ratingEmoji = '🥉';
      ratingText = 'Completed! (Bronze)';
    }
  } else {
    ratingEmoji = '🛑';
    ratingText = 'Turn Limit Exceeded';
  }

  // Visual emoji trail representing the path
  let trail = '🚩';
  for (let i = 1; i < result.path.length - 1; i++) {
    const isOptimal = result.bestPath.includes(result.path[i]);
    trail += isOptimal ? '🟩' : '🟨';
  }
  trail += isWon ? '🏁' : '❌';

  const shareText = `Suburbia 🗺️
Daily Challenge (${displayDate})
📍 ${startName} ➔ ${targetName}
${ratingEmoji} ${isWon ? `Solved in ${result.turnsUsed} turns!` : 'Turn limit reached'} [${ratingText}]
🛣️ Route: ${pathLength} suburbs (${result.turnsUsed} turns)
${trail}

Play today's daily: ${window.location.origin}${window.location.pathname}`;

  return shareText;
}
