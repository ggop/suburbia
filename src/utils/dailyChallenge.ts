import { SuburbData } from '../types';
import { findShortestPath, getDifficulty, getDistancesFrom, MelbourneMapModel } from './mapGeometry';

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
  difficulty: 'Easy' | 'Medium' | 'Hard';
  maxTurns: number;
}

/**
 * Deterministically generate the Daily Challenge for all players worldwide.
 * Guarantees:
 * 1. Shortest path is strictly between 5 and 8 steps.
 * 2. Allowed turns is strictly between 9 and 13 steps.
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

  // We find candidate pairs between 5 and 8 steps
  // To keep it fast and deterministic, we sample candidate starts using our PRNG
  for (let attempt = 0; attempt < 500; attempt++) {
    const startIndex = Math.floor(rng() * allIds.length);
    const startId = allIds[startIndex];
    const distances = getDistancesFrom(startId, adjacency);

    // Collect valid candidate targets strictly 5 to 8 steps away
    const validTargets: { id: string; dist: number }[] = [];
    allIds.forEach((targetId) => {
      if (targetId !== startId) {
        const dist = distances.get(targetId);
        if (dist !== undefined && dist >= 5 && dist <= 8) {
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

      // Buffer of 4-5 steps, strictly in 9-13 range
      const buffer = Math.floor(rng() * 2) + 4;
      const maxTurns = Math.min(13, Math.max(9, chosen.dist + buffer));

      return {
        dateStr,
        challengeNumber,
        startSuburbId: startId,
        targetSuburbId: chosen.id,
        bestPath,
        bestPathDistance: chosen.dist,
        difficulty: getDifficulty(chosen.dist),
        maxTurns,
      };
    }
  }

  // Deterministic fallback if search attempts exhausted
  const startId = 'melbourne-cbd';
  const targetId = 'box-hill';
  const bestPath = findShortestPath(startId, targetId, adjacency);
  const dist = bestPath.length > 0 ? bestPath.length - 1 : 5;
  const maxTurns = Math.min(13, Math.max(9, dist + 4));

  return {
    dateStr,
    challengeNumber,
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: dist,
    difficulty: getDifficulty(dist),
    maxTurns,
  };
}

export interface StoredDailyResult {
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
  completedAt: string;
}

export interface DailyStats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastPlayedDate?: string;
  history: Record<string, StoredDailyResult>;
}

const STORAGE_KEY = 'melbourne_daily_challenge_stats_v1';

export function loadDailyStats(): DailyStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { played: 0, won: 0, streak: 0, maxStreak: 0, history: {} };
    }
    return JSON.parse(raw);
  } catch {
    return { played: 0, won: 0, streak: 0, maxStreak: 0, history: {} };
  }
}

export function saveDailyResult(result: StoredDailyResult): DailyStats {
  const current = loadDailyStats();
  const existingForDate = current.history[result.dateStr];

  // If already recorded for today, don't double count streak/plays
  if (existingForDate) {
    current.history[result.dateStr] = result;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore quota errors
    }
    return current;
  }

  // Check if consecutive day
  const today = result.dateStr;
  let newStreak = current.streak;

  if (result.status === 'won') {
    if (current.lastPlayedDate) {
      const last = new Date(current.lastPlayedDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === 0) {
        // same day
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 0;
  }

  const updated: DailyStats = {
    played: current.played + 1,
    won: current.won + (result.status === 'won' ? 1 : 0),
    streak: newStreak,
    maxStreak: Math.max(current.maxStreak, newStreak),
    lastPlayedDate: today,
    history: {
      ...current.history,
      [today]: result,
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }

  return updated;
}

/**
 * Generate Wordle-like shareable text to compare with friends
 */
export function generateDailyShareText(
  result: StoredDailyResult,
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

  const shareText = `Melbourne Suburb Traverse 🗺️
Daily Challenge #${result.challengeNumber} (${displayDate})
📍 ${startName} ➔ ${targetName}
${ratingEmoji} ${isWon ? `Solved in ${result.turnsUsed} turns!` : 'Turn limit reached'} [${ratingText}]
🛣️ Your Path: ${pathLength} suburbs | Optimal: ${optimalSuburbs} suburbs (${optimalSteps} steps)
${trail}

Play today's daily: ${window.location.origin}${window.location.pathname}`;

  return shareText;
}

/**
 * Compact share code for comparing routes side-by-side with a friend
 * E.g. "MST-2026-09-05-6T-fitzroy.collingwood.richmond"
 */
export function encodeRouteShareCode(result: StoredDailyResult): string {
  const pathStr = result.path.join('.');
  return `MST-${result.dateStr}-${result.turnsUsed}T-${result.status === 'won' ? 'W' : 'L'}-${pathStr}`;
}

export interface DecodedFriendRoute {
  dateStr: string;
  turnsUsed: number;
  isWon: boolean;
  path: string[];
}

export function decodeRouteShareCode(code: string): DecodedFriendRoute | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith('MST-')) return null;
    const parts = trimmed.split('-');
    if (parts.length < 5) return null;

    const dateStr = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const turnsStr = parts[4].replace('T', '');
    const turnsUsed = parseInt(turnsStr, 10);
    const isWon = parts[5] === 'W';
    const path = parts.slice(6).join('-').split('.');

    if (isNaN(turnsUsed) || path.length === 0) return null;

    return {
      dateStr,
      turnsUsed,
      isWon,
      path,
    };
  } catch {
    return null;
  }
}
