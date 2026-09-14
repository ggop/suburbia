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
  SYDNEY_SUBURBS,
  PACIFIC_OCEAN_SHORELINE,
  PARRAMATTA_RIVER_GIS,
  GEORGES_RIVER_GIS,
} from '../data/sydneySuburbs';
import {
  SYDNEY_SUBURB_BOUNDARIES,
  SYDNEY_SUBURB_CENTERS,
  SYDNEY_SUBURB_ADJACENCY,
} from '../data/sydneyGeoData';
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
  PERTH_SUBURBS,
  INDIAN_OCEAN_SHORELINE,
  SWAN_RIVER_GIS,
  CANNING_RIVER_GIS,
} from '../data/perthSuburbs';
import {
  PERTH_SUBURB_BOUNDARIES,
  PERTH_SUBURB_CENTERS,
  PERTH_SUBURB_ADJACENCY,
} from '../data/perthGeoData';
import {
  BRISBANE_SUBURBS,
  MORETON_BAY_SHORELINE,
  BRISBANE_RIVER_GIS,
  PINE_RIVER_GIS,
} from '../data/brisbaneSuburbs';
import {
  BRISBANE_SUBURB_BOUNDARIES,
  BRISBANE_SUBURB_CENTERS,
  BRISBANE_SUBURB_ADJACENCY,
} from '../data/brisbaneGeoData';
import {
  HOBART_SUBURBS,
  DERWENT_ESTUARY_SHORELINE,
  RIVER_DERWENT_GIS,
  HOBART_RIVULET_GIS,
} from '../data/hobartSuburbs';
import {
  HOBART_SUBURB_BOUNDARIES,
  HOBART_SUBURB_CENTERS,
  HOBART_SUBURB_ADJACENCY,
} from '../data/hobartGeoData';
import {
  CANBERRA_SUBURBS,
  LAKE_BURLEY_GRIFFIN_SHORELINE,
  MOLONGLO_RIVER_GIS,
  MURRUMBIDGEE_RIVER_GIS,
} from '../data/canberraSuburbs';
import {
  CANBERRA_SUBURB_BOUNDARIES,
  CANBERRA_SUBURB_CENTERS,
  CANBERRA_SUBURB_ADJACENCY,
} from '../data/canberraGeoData';
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
  adelaide: {
    id: 'adelaide',
    name: 'Adelaide',
    state: 'South Australia',
    badge: 'SA',
    suburbCount: ADELAIDE_SUBURBS.length,
    waterBodyName: 'Gulf St Vincent',
  },
  brisbane: {
    id: 'brisbane',
    name: 'Brisbane',
    state: 'Queensland',
    badge: 'QLD',
    suburbCount: BRISBANE_SUBURBS.length,
    waterBodyName: 'Moreton Bay',
  },
  canberra: {
    id: 'canberra',
    name: 'Canberra',
    state: 'Australian Capital Territory',
    badge: 'ACT',
    suburbCount: CANBERRA_SUBURBS.length,
    waterBodyName: 'Lake Burley Griffin',
  },
  hobart: {
    id: 'hobart',
    name: 'Hobart',
    state: 'Tasmania',
    badge: 'TAS',
    suburbCount: HOBART_SUBURBS.length,
    waterBodyName: 'River Derwent & Storm Bay',
  },
  melbourne: {
    id: 'melbourne',
    name: 'Melbourne',
    state: 'Victoria',
    badge: 'VIC',
    suburbCount: MELBOURNE_SUBURBS.length,
    waterBodyName: 'Port Phillip Bay',
  },
  perth: {
    id: 'perth',
    name: 'Perth',
    state: 'Western Australia',
    badge: 'WA',
    suburbCount: PERTH_SUBURBS.length,
    waterBodyName: 'Indian Ocean',
  },
  sydney: {
    id: 'sydney',
    name: 'Sydney',
    state: 'New South Wales',
    badge: 'NSW',
    suburbCount: SYDNEY_SUBURBS.length,
    waterBodyName: 'Pacific Ocean',
  },
  chennai: {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    badge: 'TN',
    suburbCount: CHENNAI_SUBURBS.length,
    waterBodyName: 'Bay of Bengal',
    isBeta: true,
    hidden: true,
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
  const isSydney = cityId === 'sydney';
  const isChennai = cityId === 'chennai';
  const isPerth = cityId === 'perth';
  const isBrisbane = cityId === 'brisbane';
  const isHobart = cityId === 'hobart';
  const isCanberra = cityId === 'canberra';

  const rawSuburbs: SuburbData[] = isSydney
    ? SYDNEY_SUBURBS
    : isPerth
    ? PERTH_SUBURBS
    : isBrisbane
    ? BRISBANE_SUBURBS
    : isHobart
    ? HOBART_SUBURBS
    : isCanberra
    ? CANBERRA_SUBURBS
    : isChennai
    ? CHENNAI_SUBURBS
    : isAdelaide
    ? ADELAIDE_SUBURBS
    : MELBOURNE_SUBURBS;
  const rawBoundaries: Record<string, [number, number][]> = isSydney
    ? SYDNEY_SUBURB_BOUNDARIES
    : isPerth
    ? PERTH_SUBURB_BOUNDARIES
    : isBrisbane
    ? BRISBANE_SUBURB_BOUNDARIES
    : isHobart
    ? HOBART_SUBURB_BOUNDARIES
    : isCanberra
    ? CANBERRA_SUBURB_BOUNDARIES
    : isChennai
    ? CHENNAI_SUBURB_BOUNDARIES
    : isAdelaide
    ? ADELAIDE_SUBURB_BOUNDARIES
    : MELBOURNE_BOUNDARIES;
  const rawCenters: Record<string, [number, number]> = isSydney
    ? SYDNEY_SUBURB_CENTERS
    : isPerth
    ? PERTH_SUBURB_CENTERS
    : isBrisbane
    ? BRISBANE_SUBURB_CENTERS
    : isHobart
    ? HOBART_SUBURB_CENTERS
    : isCanberra
    ? CANBERRA_SUBURB_CENTERS
    : isChennai
    ? CHENNAI_SUBURB_CENTERS
    : isAdelaide
    ? ADELAIDE_SUBURB_CENTERS
    : MELBOURNE_CENTERS;
  const rawAdjacency: Record<string, string[]> = isSydney
    ? SYDNEY_SUBURB_ADJACENCY
    : isPerth
    ? PERTH_SUBURB_ADJACENCY
    : isBrisbane
    ? BRISBANE_SUBURB_ADJACENCY
    : isHobart
    ? HOBART_SUBURB_ADJACENCY
    : isCanberra
    ? CANBERRA_SUBURB_ADJACENCY
    : isChennai
    ? CHENNAI_SUBURB_ADJACENCY
    : isAdelaide
    ? ADELAIDE_SUBURB_ADJACENCY
    : MELBOURNE_ADJACENCY;

  const shorelineCoords: [number, number][] = isSydney
    ? PACIFIC_OCEAN_SHORELINE
    : isPerth
    ? INDIAN_OCEAN_SHORELINE
    : isBrisbane
    ? MORETON_BAY_SHORELINE
    : isHobart
    ? DERWENT_ESTUARY_SHORELINE
    : isCanberra
    ? LAKE_BURLEY_GRIFFIN_SHORELINE
    : isChennai
    ? BAY_OF_BENGAL_SHORELINE
    : isAdelaide
    ? GULF_ST_VINCENT_SHORELINE
    : PORT_PHILLIP_BAY_SHORELINE;
  const primaryRiverCoords: [number, number][] = isSydney
    ? PARRAMATTA_RIVER_GIS
    : isPerth
    ? SWAN_RIVER_GIS
    : isBrisbane
    ? BRISBANE_RIVER_GIS
    : isHobart
    ? RIVER_DERWENT_GIS
    : isCanberra
    ? MOLONGLO_RIVER_GIS
    : isChennai
    ? COOUM_RIVER_GIS
    : isAdelaide
    ? RIVER_TORRENS_GIS
    : YARRA_RIVER_GIS;
  const secondaryRiverCoords: [number, number][] = isSydney
    ? GEORGES_RIVER_GIS
    : isPerth
    ? CANNING_RIVER_GIS
    : isBrisbane
    ? PINE_RIVER_GIS
    : isHobart
    ? HOBART_RIVULET_GIS
    : isCanberra
    ? MURRUMBIDGEE_RIVER_GIS
    : isChennai
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
  if (isChennai) {
    const iit = suburbMap.get('iit-madras');
    if (iit) suburbMap.set('adyar-south', iit);
  }

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

    if (isCanberra) {
      // Lake Burley Griffin is an enclosed artificial lake in central Canberra
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ' Z';
    } else if (isChennai || isSydney || isBrisbane) {
      // For Sydney (Pacific Ocean), Brisbane (Moreton Bay), and Chennai (Bay of Bengal), water is to the EAST of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},${lastCoastPoint[1]}`;
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},-4000`;
      waterPolygonPath += ` L ${firstCoastPoint[0]},-4000`;
      waterPolygonPath += ' Z';
    } else if (isAdelaide || isPerth) {
      // For Adelaide (Gulf St Vincent) and Perth (Indian Ocean), water is to the WEST of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L -4000,${lastCoastPoint[1]}`;
      waterPolygonPath += ` L -4000,${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L -4000,-4000`;
      waterPolygonPath += ` L ${firstCoastPoint[0]},-4000`;
      waterPolygonPath += ' Z';
    } else if (isHobart) {
      // For Hobart, River Derwent estuary flows south-east into Storm Bay
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},${lastCoastPoint[1]}`;
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L -4000,${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L -4000,${firstCoastPoint[1]}`;
      waterPolygonPath += ' Z';
    } else {
      // For Melbourne, Port Phillip Bay is to the SOUTH of the coastline
      waterPolygonPath = `M ${firstCoastPoint[0]},${firstCoastPoint[1]}`;
      for (let i = 1; i < projectedCoastline.length; i++) {
        waterPolygonPath += ` L ${projectedCoastline[i][0]},${projectedCoastline[i][1]}`;
      }
      waterPolygonPath += ` L ${lastCoastPoint[0]},${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L ${SVG_WIDTH + 4000},${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L -4000,${SVG_HEIGHT + 4000}`;
      waterPolygonPath += ` L -4000,${firstCoastPoint[1]}`;
      waterPolygonPath += ' Z';
    }
  }

  // Water depth contour (subtle bathymetry contour offset slightly deeper into the bay/gulf)
  const depthContourPoints: [number, number][] = projectedCoastline.map(([x, y]) => [
    Math.round((isChennai || isSydney || isBrisbane ? x + 18 : isAdelaide || isPerth ? x - 18 : x - 14) * 10) / 10,
    Math.round((isChennai || isSydney || isBrisbane ? y : isAdelaide || isPerth ? y : y + 12) * 10) / 10,
  ]);
  const waterDepthContourPath = isCanberra ? '' : pointsToSvgPath(depthContourPoints);

  // Rivers
  const projectedPrimaryRiver: [number, number][] = primaryRiverCoords.map(([lng, lat]) =>
    project(lng, lat)
  );
  const primaryRiverPath = pointsToSvgPath(projectedPrimaryRiver);

  const projectedSecondaryRiver: [number, number][] = secondaryRiverCoords.map(([lng, lat]) =>
    project(lng, lat)
  );
  const secondaryRiverPath = pointsToSvgPath(projectedSecondaryRiver);

  const cityName = isSydney ? 'Sydney' : isPerth ? 'Perth' : isBrisbane ? 'Brisbane' : isHobart ? 'Hobart' : isCanberra ? 'Canberra' : isChennai ? 'Chennai' : isAdelaide ? 'Adelaide' : 'Melbourne';
  const stateName = isSydney ? 'New South Wales' : isPerth ? 'Western Australia' : isBrisbane ? 'Queensland' : isHobart ? 'Tasmania' : isCanberra ? 'Australian Capital Territory' : isChennai ? 'Tamil Nadu' : isAdelaide ? 'South Australia' : 'Victoria';
  const waterBodyName = isSydney ? 'Pacific Ocean' : isPerth ? 'Indian Ocean' : isBrisbane ? 'Moreton Bay' : isHobart ? 'River Derwent & Storm Bay' : isCanberra ? 'Lake Burley Griffin' : isChennai ? 'Bay of Bengal' : isAdelaide ? 'Gulf St Vincent' : 'Port Phillip Bay';
  const primaryRiverName = isSydney ? 'Sydney Harbour & Parramatta River' : isPerth ? 'Swan River (Derbarl Yerrigan)' : isBrisbane ? 'Brisbane River (Maiwar)' : isHobart ? 'River Derwent (Timtumili Minanya)' : isCanberra ? 'Molonglo River & Lake Burley Griffin' : isChennai ? 'Cooum River (Koovam)' : isAdelaide ? 'River Torrens (Karrawirra Parri)' : 'Yarra River (Birrarung)';
  const secondaryRiverName = isSydney ? 'Georges River (Tucoerah)' : isPerth ? 'Canning River (Djarlgarro Beelier)' : isBrisbane ? 'Pine River' : isHobart ? 'Hobart Rivulet' : isCanberra ? 'Murrumbidgee River' : isChennai ? 'Adyar River' : isAdelaide ? 'Port River (Yertabulti)' : 'Maribyrnong River';
  const waterLabelX = isCanberra ? 752 : isSydney ? 1320 : isBrisbane ? 1310 : isHobart ? 850 : isChennai ? 1280 : isAdelaide || isPerth ? 60 : 260;
  const waterLabelY = isCanberra ? 528 : isSydney ? 560 : isBrisbane ? 530 : isHobart ? 1020 : isChennai ? 520 : isAdelaide || isPerth ? 540 : 930;

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
 * Generate a new random game where shortest path is strictly 5 or 6 steps (not including the target as a step), and allowed turns is strictly 10.
 */
export function generateRandomGame(
  suburbs: SuburbData[],
  adjacency: Map<string, string[]>,
  cityId: CityId = 'melbourne'
): GeneratedGame {
  const allIds = suburbs.map((s) => s.id);

  // Try multiple times to find a pairing strictly 5 or 6 steps away (excluding target)
  // Distance of 6 edges in graph = 5 steps excluding target (path has 7 nodes)
  // Distance of 7 edges in graph = 6 steps excluding target (path has 8 nodes)
  for (let attempt = 0; attempt < 800; attempt++) {
    const randomStart = allIds[Math.floor(Math.random() * allIds.length)];
    const distances = getDistancesFrom(randomStart, adjacency);

    // Candidates strictly 5 or 6 steps away (excluding target)
    const validCandidates: { id: string; dist: number }[] = [];
    distances.forEach((dist, id) => {
      if (dist === 6 || dist === 7) {
        validCandidates.push({ id, dist });
      }
    });

    if (validCandidates.length > 0) {
      const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
      const bestPath = findShortestPath(randomStart, chosen.id, adjacency);
      const steps = bestPath.length - 2;
      if (steps === 5 || steps === 6) {
        return {
          startSuburbId: randomStart,
          targetSuburbId: chosen.id,
          bestPath,
          bestPathDistance: steps,
          maxTurns: 10,
        };
      }
    }
  }

  // Guaranteed fallback (strictly 5 or 6 steps excluding target)
  const startId =
    cityId === 'sydney'
      ? 'sydney'
      : cityId === 'perth'
      ? 'perth'
      : cityId === 'brisbane'
      ? 'brisbane-city'
      : cityId === 'hobart'
      ? 'hobart'
      : cityId === 'chennai'
      ? 't-nagar'
      : cityId === 'adelaide'
      ? 'adelaide-cbd'
      : cityId === 'canberra'
      ? 'city'
      : 'melbourne-cbd';
  const targetId =
    cityId === 'sydney'
      ? 'burwood'
      : cityId === 'perth'
      ? 'fremantle'
      : cityId === 'brisbane'
      ? 'sunnybank'
      : cityId === 'hobart'
      ? 'lower-snug'
      : cityId === 'chennai'
      ? 'anna-nagar-east'
      : cityId === 'adelaide'
      ? 'glenelg'
      : cityId === 'canberra'
      ? 'melba'
      : 'kealba';
  const bestPath = findShortestPath(startId, targetId, adjacency);
  return {
    startSuburbId: startId,
    targetSuburbId: targetId,
    bestPath,
    bestPathDistance: Math.max(1, bestPath.length - 2),
    maxTurns: 10,
  };
}
