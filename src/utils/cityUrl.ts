import { CityId } from '../types';
import { CITIES } from './mapGeometry';
import { loadSelectedCity, saveSelectedCity, VALID_CITIES } from './gameStateStorage';

/**
 * Checks if a string is a valid, playable (non-hidden) city ID.
 */
export function isValidPlayableCity(id: string | null | undefined): id is CityId {
  if (!id) return false;
  const normalized = id.trim().toLowerCase();
  return VALID_CITIES.includes(normalized as CityId) && !CITIES[normalized as CityId]?.hidden;
}

/**
 * Parses the current window location to extract a city ID if specified.
 * Supports:
 * - URL Path: /singapore, /sydney, /melbourne, /adelaide, etc. (case-insensitive)
 * - Query Param: ?city=singapore or ?c=singapore
 * - Hash: #singapore or #/singapore
 */
export function getCityFromUrl(): CityId | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check pathname segments (e.g., "/singapore", "/suburbia/sydney", "/singapore/")
    const pathSegments = window.location.pathname
      .toLowerCase()
      .split('/')
      .map((s) => s.replace(/\.html?$/i, '').trim())
      .filter(Boolean);

    for (const segment of pathSegments) {
      if (isValidPlayableCity(segment)) {
        return segment;
      }
    }

    // 2. Check query parameters (?city=singapore, ?c=singapore, or query flag like ?singapore)
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const cityParam = searchParams.get('city') || searchParams.get('c');
      if (cityParam && isValidPlayableCity(cityParam)) {
        return cityParam.toLowerCase() as CityId;
      }
      for (const [key, value] of searchParams.entries()) {
        if (isValidPlayableCity(key)) {
          return key.toLowerCase() as CityId;
        }
        if (isValidPlayableCity(value)) {
          return value.toLowerCase() as CityId;
        }
      }
    }

    // 3. Check hash fragment (#singapore, #/singapore, #city=singapore, or #?city=singapore)
    if (window.location.hash) {
      const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      const hashParts = rawHash.split(/[\/?&=]/).filter(Boolean);
      for (const part of hashParts) {
        if (isValidPlayableCity(part)) {
          return part as CityId;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse city from URL:', err);
  }

  return null;
}

/**
 * Resolves the initial city to load:
 * 1. URL path / query / hash (takes immediate priority)
 * 2. Stored user city in localStorage
 * 3. Default fallback: 'melbourne'
 */
export function getInitialCity(): CityId {
  const cityFromUrl = getCityFromUrl();
  if (cityFromUrl) {
    saveSelectedCity(cityFromUrl);
    return cityFromUrl;
  }

  const storedCity = loadSelectedCity();
  if (isValidPlayableCity(storedCity)) {
    return storedCity;
  }

  return 'melbourne';
}

/**
 * Updates the browser address bar to reflect the selected city in all lowercase.
 * e.g., `/singapore`, `/sydney`, `/melbourne`
 */
export function syncCityUrl(cityId: CityId, replace: boolean = true): void {
  if (typeof window === 'undefined' || typeof window.history === 'undefined') return;

  try {
    const lowercaseCity = cityId.toLowerCase();
    const targetPath = `/${lowercaseCity}`;
    const currentPath = window.location.pathname.toLowerCase();

    // Preserve any unrelated query parameters or hash if needed
    if (currentPath !== targetPath) {
      if (replace) {
        window.history.replaceState({ cityId: lowercaseCity }, '', targetPath);
      } else {
        window.history.pushState({ cityId: lowercaseCity }, '', targetPath);
      }
    }
  } catch (err) {
    console.warn('Failed to sync city URL:', err);
  }
}
