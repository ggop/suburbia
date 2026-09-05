import {
  MELBOURNE_SUBURBS,
  PORT_PHILLIP_BAY_SHORELINE,
  YARRA_RIVER_GIS,
  MARIBYRNONG_RIVER_GIS,
} from '../data/melbourneSuburbs';
import {
  SUBURB_BOUNDARIES,
  SUBURB_CENTERS,
  SUBURB_ADJACENCY,
} from '../data/suburbGeoData';
import {
  computePolygonAreaKm2,
  getEstimatedPopulation,
  getApproximateAge,
  getNotableHistoricalFact,
} from '../data/suburbStats';
import { SuburbProjected, SuburbData, GameDifficulty } from '../types';

export const SVG_WIDTH = 1500;
export const SVG_HEIGHT = 1100;
const PADDING = 60;

export interface MelbourneMapModel {
  suburbs: SuburbProjected[];
  suburbMap: Map<string, SuburbProjected>;
  adjacency: Map<string, string[]>;
  waterPolygonPath: string;
  coastlinePath: string;
  yarraRiverPath: string;
  maribyrnongRiverPath: string;
  waterDepthContourPath: string;
}

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
 * Build projected geometry with authentic Victorian cadastral suburb boundaries,
 * realistic sizes, high-resolution GIS waterways, and connected adjacency graph.
 */
export function buildMelbourneMapModel(): MelbourneMapModel {
  // Compute bounds across all actual suburb boundary polygons
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of Object.values(SUBURB_BOUNDARIES)) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  // Subtle margin around metropolitan bounds
  minLat -= 0.02;
  maxLat += 0.02;
  minLng -= 0.02;
  maxLng += 0.02;

  // Aspect ratio correction for Melbourne latitude ~ -37.8 degrees
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
  for (const [id, neighbors] of Object.entries(SUBURB_ADJACENCY)) {
    adjacency.set(id, neighbors);
  }

  // Build projected suburbs with authentic cadastral boundaries and demographic stats
  const suburbs: SuburbProjected[] = MELBOURNE_SUBURBS.map((s) => {
    const rawRing = SUBURB_BOUNDARIES[s.id] || [];
    const projectedPolygon: [number, number][] = rawRing.map(([lng, lat]) => project(lng, lat));

    // Place label & badge at authentic visual center inside suburb polygon
    const centerLngLat = SUBURB_CENTERS[s.id] || [s.lng, s.lat];
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

  // 1. Port Phillip Bay Shoreline
  const projectedCoastline: [number, number][] = PORT_PHILLIP_BAY_SHORELINE.map(([lng, lat]) =>
    project(lng, lat)
  );

  const coastlinePath = pointsToSvgPath(projectedCoastline);

  // High-Resolution Port Phillip Bay Water Polygon:
  // Traces along the projected coastline, then around the bottom perimeter of the SVG canvas
  const firstCoastPoint = projectedCoastline[0];
  const lastCoastPoint = projectedCoastline[projectedCoastline.length - 1];

  let waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
  for (let i = 1; i < projectedCoastline.length; i++) {
    waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
  }
  // From Frankston / Oliver's Hill south to bottom of SVG, across to bottom-left, up to Werribee South
  waterPolygonPath += ` L ${lastCoastPoint[0]},${SVG_HEIGHT + 300}`;
  waterPolygonPath += ` L -200,${SVG_HEIGHT + 300}`;
  waterPolygonPath += ` L -200,${firstCoastPoint[1]}`;
  waterPolygonPath += ' Z';

  // Water depth contour (subtle bathymetry contour offset slightly deeper into the bay)
  const depthContourPoints: [number, number][] = projectedCoastline.map(([x, y]) => [
    Math.round((x - 14) * 10) / 10,
    Math.round((y + 12) * 10) / 10,
  ]);
  const waterDepthContourPath = pointsToSvgPath(depthContourPoints);

  // 2. Yarra River (Birrarung)
  const projectedYarra: [number, number][] = YARRA_RIVER_GIS.map(([lng, lat]) => project(lng, lat));
  const yarraRiverPath = pointsToSvgPath(projectedYarra);

  // 3. Maribyrnong River
  const projectedMaribyrnong: [number, number][] = MARIBYRNONG_RIVER_GIS.map(([lng, lat]) =>
    project(lng, lat)
  );
  const maribyrnongRiverPath = pointsToSvgPath(projectedMaribyrnong);

  return {
    suburbs,
    suburbMap,
    adjacency,
    waterPolygonPath,
    coastlinePath,
    yarraRiverPath,
    maribyrnongRiverPath,
    waterDepthContourPath,
  };
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

export function getDifficulty(steps: number): GameDifficulty {
  if (steps <= 5) return 'Easy';
  if (steps <= 7) return 'Medium';
  return 'Hard';
}

export interface GeneratedGame {
  startSuburbId: string;
  targetSuburbId: string;
  bestPath: string[];
  bestPathDistance: number;
  difficulty: GameDifficulty;
}

/**
 * Generate a new random game where minimum steps required is 5 and maximum is 8.
 * 5 step problems = Easy, 6-7 = Medium, 8 = Hard.
 */
export function generateRandomGame(
  suburbs: SuburbData[],
  adjacency: Map<string, string[]>
): GeneratedGame {
  const allIds = suburbs.map((s) => s.id);

  // Try multiple times to find a pairing strictly between 5 and 8 steps away
  for (let attempt = 0; attempt < 800; attempt++) {
    const randomStart = allIds[Math.floor(Math.random() * allIds.length)];
    const distances = getDistancesFrom(randomStart, adjacency);

    // Candidates strictly between 5 and 8 steps away
    const validCandidates: { id: string; dist: number }[] = [];
    distances.forEach((dist, id) => {
      if (dist >= 5 && dist <= 8) {
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
        bestPathDistance: chosen.dist,
        difficulty: getDifficulty(chosen.dist),
      };
    }
  }

  // Guaranteed fallback: Melbourne CBD to Box Hill (5 steps, Easy)
  const startId = 'melbourne-cbd';
  const targetId = 'box-hill';
  const bestPath = findShortestPath(startId, targetId, adjacency);
  const dist = bestPath.length > 0 ? bestPath.length - 1 : 5;
  return {
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: dist,
    difficulty: getDifficulty(dist),
  };
}
