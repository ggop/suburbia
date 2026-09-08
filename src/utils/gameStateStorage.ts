import { GameMode, GameState } from '../types';

const DAILY_ACTIVE_KEY_PREFIX = 'suburbia_daily_active_';
const PRACTICE_ACTIVE_KEY = 'suburbia_practice_active_v1';
const LAST_MODE_KEY = 'suburbia_last_mode_v1';

export function getDailyActiveStorageKey(dateStr: string): string {
  return `${DAILY_ACTIVE_KEY_PREFIX}${dateStr}`;
}

export function saveActiveGameState(state: GameState): void {
  try {
    if (state.gameMode === 'daily' && state.dailyDate) {
      localStorage.setItem(getDailyActiveStorageKey(state.dailyDate), JSON.stringify(state));
    } else if (state.gameMode === 'practice') {
      localStorage.setItem(PRACTICE_ACTIVE_KEY, JSON.stringify(state));
    }
    localStorage.setItem(LAST_MODE_KEY, state.gameMode);
  } catch (err) {
    console.warn('Failed to save active game state to localStorage:', err);
  }
}

export function loadActiveDailyState(dateStr: string): GameState | null {
  try {
    const raw = localStorage.getItem(getDailyActiveStorageKey(dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      parsed &&
      parsed.gameMode === 'daily' &&
      parsed.dailyDate === dateStr &&
      Array.isArray(parsed.path) &&
      parsed.path.length > 0 &&
      typeof parsed.turnsUsed === 'number'
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load active daily state:', err);
  }
  return null;
}

export function loadActivePracticeState(): GameState | null {
  try {
    const raw = localStorage.getItem(PRACTICE_ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      parsed &&
      parsed.gameMode === 'practice' &&
      Array.isArray(parsed.path) &&
      parsed.path.length > 0 &&
      typeof parsed.turnsUsed === 'number'
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load active practice state:', err);
  }
  return null;
}

export function loadLastMode(): GameMode {
  try {
    const mode = localStorage.getItem(LAST_MODE_KEY);
    if (mode === 'practice' || mode === 'daily') {
      return mode;
    }
  } catch {
    // fallback
  }
  return 'daily';
}
