import {
  MELBOURNE_SUBURBS,
  PORT_PHILLIP_BAY_SHORELINE,
  YARRA_RIVER_GIS,
  MARIBYRNONG_RIVER_GIS,
} from '../data/melbourneSuburbs';
import {
  SUBURB_BOUNDARIES as MELBOURNE_BOUNDARIES,
  SUBURB_CENTERS as MELBOURNE_CENTERS,
  SUBURB_ADJACENCY as MELBOURNE_ADJACENCY,
} from '../data/suburbGeoData';
import {
  ADELAIDE_SUBURBS,
  GULF_ST_VINCENT_SHORELINE,
  RIVER_TORRENS_GIS,
  PORT_RIVER_GIS,
} from '../data/adelaideSuburbs';
import {
  ADELAIDE_SUBURB_BOUNDARIES,
  ADELAIDE_SUBURB_CENTERS,
  ADELAIDE_SUBURB_ADJACENCY,
} from '../data/adelaideGeoData';
import {
  CHENNAI_SUBURBS,
  BAY_OF_BENGAL_SHORELINE,
  COOUM_RIVER_GIS,
  ADYAR_RIVER_GIS,
} from '../data/chennaiSuburbs';
import {
  CHENNAI_SUBURB_BOUNDARIES,
  CHENNAI_SUBURB_CENTERS,
  CHENNAI_SUBURB_ADJACENCY,
} from '../data/chennaiGeoData';
import {
  computePolygonAreaKm2,
  getEstimatedPopulation,
  getApproximateAge,
  getNotableHistoricalFact,
} from '../data/suburbStats';
import { SuburbProjected, SuburbData, CityId, CityOption } from '../types';

export const SVG_WIDTH = 1500;
export const SVG_HEIGHT = 1100;
const PADDING = 60;

export const CITIES: Record<CityId, CityOption> = {
  melbourne: {
    id: 'melbourne',
    name: 'Melbourne',
    state: 'Victoria',
    badge: 'VIC',
    suburbCount: 88,
    waterBodyName: 'Port Phillip Bay',
  },
  adelaide: {
    id: 'adelaide',
    name: 'Adelaide',
    state: 'South Australia',
    badge: 'SA',
    suburbCount: 401,
    waterBodyName: 'Gulf St Vincent',
  },
  chennai: {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    badge: 'TN',
    suburbCount: 201,
    waterBodyName: 'Bay of Bengal',
  },
};

export interface CityMapModel {
  cityId: CityId;
  cityName: string;
  stateName: string;
  suburbs: SuburbProjected[];
  suburbMap: Map<string, SuburbProjected>;
  adjacency: Map<string, string[]>;
  waterPolygonPath: string;
  coastlinePath: string;
  primaryRiverPath: string;
  secondaryRiverPath: string;
  waterDepthContourPath: string;
  waterBodyName: string;
  primaryRiverName: string;
  secondaryRiverName: string;
  waterLabelX: number;
  waterLabelY: number;
  // Aliases for Melbourne backward-compatibility
  yarraRiverPath: string;
  maribyrnongRiverPath: string;
}

export type MelbourneMapModel = CityMapModel;

/**
 * Convert an array of 2D points to an SVG smooth curve path
 */
function pointsToSvgPath(points: [number, number][], close = false): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;

  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]},${points[i][1]}`;
  }
  if (close) {
    d += ' Z';
  }
  return d;
}

/**
 * Build projected geometry with authentic cadastral suburb boundaries,
 * realistic sizes, high-resolution GIS waterways, and connected adjacency graph.
 */
export function buildCityMapModel(cityId: CityId = 'melbourne'): CityMapModel {
  const isAdelaide = cityId === 'adelaide';
  const isChennai = cityId === 'chennai';

  const rawSuburbs: SuburbData[] = isChennai
    ? CHENNAI_SUBURBS
    : isAdelaide
    ? ADELAIDE_SUBURBS
    : MELBOURNE_SUBURBS;
  const rawBoundaries: Record<string, [number, number][]> = isChennai
    ? CHENNAI_SUBURB_BOUNDARIES
    : isAdelaide
    ? ADELAIDE_SUBURB_BOUNDARIES
    : MELBOURNE_BOUNDARIES;
  const rawCenters: Record<string, [number, number]> = isChennai
    ? CHENNAI_SUBURB_CENTERS
    : isAdelaide
    ? ADELAIDE_SUBURB_CENTERS
    : MELBOURNE_CENTERS;
  const rawAdjacency: Record<string, string[]> = isChennai
    ? CHENNAI_SUBURB_ADJACENCY
    : isAdelaide
    ? ADELAIDE_SUBURB_ADJACENCY
    : MELBOURNE_ADJACENCY;

  const shorelineCoords: [number, number][] = isChennai
    ? BAY_OF_BENGAL_SHORELINE
    : isAdelaide
    ? GULF_ST_VINCENT_SHORELINE
    : PORT_PHILLIP_BAY_SHORELINE;
  const primaryRiverCoords: [number, number][] = isChennai
    ? COOUM_RIVER_GIS
    : isAdelaide
    ? RIVER_TORRENS_GIS
    : YARRA_RIVER_GIS;
  const secondaryRiverCoords: [number, number][] = isChennai
    ? ADYAR_RIVER_GIS
    : isAdelaide
    ? PORT_RIVER_GIS
    : MARIBYRNONG_RIVER_GIS;

  // Compute bounds across all suburb boundary polygons
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of Object.values(rawBoundaries)) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  // Margin around metropolitan bounds
  minLat -= 0.02;
  maxLat += 0.02;
  minLng -= 0.02;
  maxLng += 0.02;

  // Aspect ratio correction for city latitude
  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(midLatRad);

  const usableWidth = SVG_WIDTH - PADDING * 2;
  const usableHeight = SVG_HEIGHT - PADDING * 2;

  const latSpan = maxLat - minLat;
  const lngSpan = (maxLng - minLng) * cosLat;

  const scale = Math.min(usableWidth / lngSpan, usableHeight / latSpan);

  const xOffset = PADDING + (usableWidth - lngSpan * scale) / 2;
  const yOffset = PADDING + (usableHeight - latSpan * scale) / 2;

  // Projection helper function
  const project = (lng: number, lat: number): [number, number] => {
    const x = Math.round((xOffset + (lng - minLng) * cosLat * scale) * 10) / 10;
    const y = Math.round((yOffset + (maxLat - lat) * scale) * 10) / 10;
    return [x, y];
  };

  // Convert to final adjacency map
  const adjacency = new Map<string, string[]>();
  for (const [id, neighbors] of Object.entries(rawAdjacency)) {
    adjacency.set(id, neighbors);
  }

  // Build projected suburbs with authentic cadastral boundaries and demographic stats
  const suburbs: SuburbProjected[] = rawSuburbs.map((s) => {
    const rawRing = rawBoundaries[s.id] || [];
    const projectedPolygon: [number, number][] = rawRing.map(([lng, lat]) => project(lng, lat));

    // Place label & badge at authentic visual center inside suburb polygon
    const centerLngLat = rawCenters[s.id] || [s.lng, s.lat];
    const [cx, cy] = project(centerLngLat[0], centerLngLat[1]);

    const areaKm2 = computePolygonAreaKm2(rawRing);
    const population = getEstimatedPopulation(s, areaKm2);
    const approximateAge = getApproximateAge(s);
    const notableFact = getNotableHistoricalFact(s);

    return {
      ...s,
      historicalFact: notableFact,
      areaKm2,
      population,
      approximateAge,
      x: cx,
      y: cy,
      polygon: projectedPolygon,
      neighbors: adjacency.get(s.id) || [],
    };
  });

  const suburbMap = new Map<string, SuburbProjected>();
  suburbs.forEach((s) => suburbMap.set(s.id, s));

  // --- Project High-Resolution GIS Waterways ---
  const projectedCoastline: [number, number][] = shorelineCoords.map(([lng, lat]) =>
    project(lng, lat)
  );
  const coastlinePath = pointsToSvgPath(projectedCoastline);

  // High-Resolution Water Polygon
  let waterPolygonPath = '';
  if (projectedCoastline.length > 0) {
    const firstCoastPoint = projectedCoastline[0];
    const lastCoastPoint = projectedCoastline[projectedCoastline.length - 1];

    if (isChennai) {
      // For Chennai, Bay of Bengal is to the EAST of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L ${SVG_WIDTH + 300},${lastCoastPoint[1]}`;
      waterPolygonPath += ` L ${SVG_WIDTH + 300},${firstCoastPoint[1]}`;
      waterPolygonPath += ' Z';
    } else if (isAdelaide) {
      // For Adelaide, Gulf St Vincent is to the WEST of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L -200,${lastCoastPoint[1]}`;
      waterPolygonPath += ` L -200,${firstCoastPoint[1]}`;
      waterPolygonPath += ' Z';
    } else {
      // For Melbourne, Port Phillip Bay is to the SOUTH of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L ${lastCoastPoint[0]},${SVG_HEIGHT + 300}`;
      waterPolygonPath += ` L -200,${SVG_HEIGHT + 300}`;
      waterPolygonPath += ` L -200,${firstCoastPoint[1]}`;
      waterPolygonPath += ' Z';
    }
  }

  // Water depth contour (subtle bathymetry contour offset slightly deeper into the bay/gulf)
  const depthContourPoints: [number, number][] = projectedCoastline.map(([x, y]) => [
    Math.round((isChennai ? x + 18 : isAdelaide ? x - 18 : x - 14) * 10) / 10,
    Math.round((isChennai ? y : isAdelaide ? y : y + 12) * 10) / 10,
  ]);
  const waterDepthContourPath = pointsToSvgPath(depthContourPoints);

  // Rivers
  const projectedPrimaryRiver: [number, number][] = primaryRiverCoords.map(([lng, lat]) =>
    project(lng, lat)
  );
  const primaryRiverPath = pointsToSvgPath(projectedPrimaryRiver);

  const projectedSecondaryRiver: [number, number][] = secondaryRiverCoords.map(([lng, lat]) =>
    project(lng, lat)
  );
  const secondaryRiverPath = pointsToSvgPath(projectedSecondaryRiver);

  const cityName = isChennai ? 'Chennai' : isAdelaide ? 'Adelaide' : 'Melbourne';
  const stateName = isChennai ? 'Tamil Nadu' : isAdelaide ? 'South Australia' : 'Victoria';
  const waterBodyName = isChennai ? 'Bay of Bengal' : isAdelaide ? 'Gulf St Vincent' : 'Port Phillip Bay';
  const primaryRiverName = isChennai ? 'Cooum River (Koovam)' : isAdelaide ? 'River Torrens (Karrawirra Parri)' : 'Yarra River (Birrarung)';
  const secondaryRiverName = isChennai ? 'Adyar River' : isAdelaide ? 'Port River (Yertabulti)' : 'Maribyrnong River';
  const waterLabelX = isChennai ? 1280 : isAdelaide ? 60 : 260;
  const waterLabelY = isChennai ? 520 : isAdelaide ? 540 : 930;

  return {
    cityId,
    cityName,
    stateName,
    suburbs,
    suburbMap,
    adjacency,
    waterPolygonPath,
    coastlinePath,
    primaryRiverPath,
    secondaryRiverPath,
    waterDepthContourPath,
    waterBodyName,
    primaryRiverName,
    secondaryRiverName,
    waterLabelX,
    waterLabelY,
    yarraRiverPath: primaryRiverPath,
    maribyrnongRiverPath: secondaryRiverPath,
  };
}

export function buildMelbourneMapModel(): MelbourneMapModel {
  return buildCityMapModel('melbourne');
}

/**
 * Breadth-First Search (BFS) for shortest path between start and target
 */
export function findShortestPath(
  startId: string,
  targetId: string,
  adjacency: Map<string, string[]>
): string[] {
  if (startId === targetId) return [startId];

  const queue: string[] = [startId];
  const parent = new Map<string, string | null>();
  parent.set(startId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) break;

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!parent.has(neighbor)) {
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  if (!parent.has(targetId)) {
    return []; // No path found
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = targetId;
  while (curr !== null) {
    path.unshift(curr);
    curr = parent.get(curr) ?? null;
  }

  return path;
}

/**
 * Get all distances from a given source suburb
 */
export function getDistancesFrom(
  startId: string,
  adjacency: Map<string, string[]>
): Map<string, number> {
  const distances = new Map<string, number>();
  distances.set(startId, 0);

  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }

  return distances;
}

export interface GeneratedGame {
  startSuburbId: string;
  targetSuburbId: string;
  bestPath: string[];
  bestPathDistance: number;
  maxTurns: number;
}

/**
 * Generate a new random game where shortest path is strictly 5 steps, and allowed turns is strictly 10.
 */
export function generateRandomGame(
  suburbs: SuburbData[],
  adjacency: Map<string, string[]>,
  cityId: CityId = 'melbourne'
): GeneratedGame {
  const allIds = suburbs.map((s) => s.id);

  // Try multiple times to find a pairing strictly 5 steps away
  for (let attempt = 0; attempt < 800; attempt++) {
    const randomStart = allIds[Math.floor(Math.random() * allIds.length)];
    const distances = getDistancesFrom(randomStart, adjacency);

    // Candidates strictly 5 steps away
    const validCandidates: { id: string; dist: number }[] = [];
    distances.forEach((dist, id) => {
      if (dist === 5) {
        validCandidates.push({ id, dist });
      }
    });

    if (validCandidates.length > 0) {
      const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
      const bestPath = findShortestPath(randomStart, chosen.id, adjacency);
      return {
        startSuburbId: randomStart,
        targetSuburbId: chosen.id,
        bestPath,
        bestPathDistance: Math.max(1, bestPath.length - 2),
        maxTurns: 10,
      };
    }
  }

  // Guaranteed fallback
  const startId = cityId === 'chennai' ? 't-nagar' : cityId === 'adelaide' ? 'adelaide-cbd' : 'melbourne-cbd';
  const targetId = cityId === 'chennai' ? 'besant-nagar' : cityId === 'adelaide' ? 'glenelg' : 'box-hill';
  const bestPath = findShortestPath(startId, targetId, adjacency);
  return {
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: Math.max(1, bestPath.length - 2),
    maxTurns: 10,
  };
}
