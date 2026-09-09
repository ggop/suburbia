import { GameMode, GameState, CityId } from '../types';

const DAILY_ACTIVE_KEY_PREFIX = 'suburbia_daily_active_';
const PRACTICE_ACTIVE_KEY_PREFIX = 'suburbia_practice_active_';
const LAST_MODE_KEY = 'suburbia_last_mode_v1';
const SELECTED_CITY_KEY = 'suburbia_selected_city_v1';

export function getDailyActiveStorageKey(dateStr: string, cityId: CityId = 'melbourne'): string {
  return `${DAILY_ACTIVE_KEY_PREFIX}${cityId}_${dateStr}`;
}

export function getPracticeActiveStorageKey(cityId: CityId = 'melbourne'): string {
  return `${PRACTICE_ACTIVE_KEY_PREFIX}${cityId}_v1`;
}

export function saveActiveGameState(state: GameState): void {
  try {
    const cityId = state.cityId || 'melbourne';
    if (state.gameMode === 'daily' && state.dailyDate) {
      localStorage.setItem(getDailyActiveStorageKey(state.dailyDate, cityId), JSON.stringify(state));
    } else if (state.gameMode === 'practice') {
      localStorage.setItem(getPracticeActiveStorageKey(cityId), JSON.stringify(state));
    }
    localStorage.setItem(LAST_MODE_KEY, state.gameMode);
    localStorage.setItem(SELECTED_CITY_KEY, cityId);
  } catch (err) {
    console.warn('Failed to save active game state to localStorage:', err);
  }
}

export function loadActiveDailyState(dateStr: string, cityId: CityId = 'melbourne'): GameState | null {
  try {
    // Try city-specific key first
    let raw = localStorage.getItem(getDailyActiveStorageKey(dateStr, cityId));
    // If not found and city is melbourne, check legacy key
    if (!raw && cityId === 'melbourne') {
      raw = localStorage.getItem(`${DAILY_ACTIVE_KEY_PREFIX}${dateStr}`);
    }
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
      return {
        ...parsed,
        cityId: parsed.cityId || cityId,
      };
    }
  } catch (err) {
    console.warn('Failed to load active daily state:', err);
  }
  return null;
}

export function loadActivePracticeState(cityId: CityId = 'melbourne'): GameState | null {
  try {
    let raw = localStorage.getItem(getPracticeActiveStorageKey(cityId));
    if (!raw && cityId === 'melbourne') {
      raw = localStorage.getItem('suburbia_practice_active_v1');
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      parsed &&
      parsed.gameMode === 'practice' &&
      Array.isArray(parsed.path) &&
      parsed.path.length > 0 &&
      typeof parsed.turnsUsed === 'number'
    ) {
      return {
        ...parsed,
        cityId: parsed.cityId || cityId,
      };
    }
  } catch (err) {
    console.warn('Failed to load active practice state:', err);
  }
  return null;
}

export function loadSelectedCity(): CityId {
  try {
    const saved = localStorage.getItem(SELECTED_CITY_KEY);
    if (saved === 'adelaide' || saved === 'melbourne' || saved === 'chennai') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'melbourne';
}

export function saveSelectedCity(cityId: CityId): void {
  try {
    localStorage.setItem(SELECTED_CITY_KEY, cityId);
  } catch (err) {
    console.warn('Failed to save selected city:', err);
  }
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
