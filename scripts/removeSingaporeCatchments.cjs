const fs = require('fs');
const path = require('path');

const { SINGAPORE_SUBURBS, SINGAPORE_STRAIT_SHORELINE, JOHOR_STRAIT_SHORELINE, SINGAPORE_RIVER_GIS, KALLANG_RIVER_GIS } = require('../src/data/singaporeSuburbs');
const { SINGAPORE_SUBURB_BOUNDARIES, SINGAPORE_SUBURB_CENTERS, SINGAPORE_SUBURB_ADJACENCY } = require('../src/data/singaporeGeoData');

const EXCLUDED = new Set(['central-water-catchment', 'western-water-catchment', 'north-eastern-islands']);

// 1. Filter suburbs
const filteredSuburbs = SINGAPORE_SUBURBS.filter(s => !EXCLUDED.has(s.id));
console.log(`Filtered suburbs count: ${filteredSuburbs.length}`);

// 2. Filter boundaries & centers
const filteredBoundaries = {};
const filteredCenters = {};
for (const [id, poly] of Object.entries(SINGAPORE_SUBURB_BOUNDARIES)) {
  if (!EXCLUDED.has(id)) {
    filteredBoundaries[id] = poly;
  }
}
for (const [id, center] of Object.entries(SINGAPORE_SUBURB_CENTERS)) {
  if (!EXCLUDED.has(id)) {
    filteredCenters[id] = center;
  }
}

// 3. Filter adjacency
const filteredAdjacency = {};
for (const [id, neighbors] of Object.entries(SINGAPORE_SUBURB_ADJACENCY)) {
  if (EXCLUDED.has(id)) continue;
  const validNeighbors = neighbors.filter(n => !EXCLUDED.has(n)).sort();
  filteredAdjacency[id] = validNeighbors;
}

// Verify connectivity
function findShortestPath(startId, targetId, adj) {
  if (startId === targetId) return [startId];
  const q = [startId];
  const parent = new Map();
  parent.set(startId, null);

  while (q.length > 0) {
    const cur = q.shift();
    if (cur === targetId) break;
    const neighbors = adj[cur] || [];
    for (const n of neighbors) {
      if (!parent.has(n)) {
        parent.set(n, cur);
        q.push(n);
      }
    }
  }

  if (!parent.has(targetId)) return [];
  const path = [];
  let curr = targetId;
  while (curr !== null) {
    path.unshift(curr);
    curr = parent.get(curr);
  }
  return path;
}

const startCheckId = 'downtown-core';
const visitedCheck = new Set([startCheckId]);
const qCheck = [startCheckId];
while (qCheck.length > 0) {
  const cur = qCheck.shift();
  for (const n of filteredAdjacency[cur] || []) {
    if (!visitedCheck.has(n)) {
      visitedCheck.add(n);
      qCheck.push(n);
    }
  }
}

console.log(`Connected components check: ${visitedCheck.size} / ${filteredSuburbs.length} planning areas reachable.`);
if (visitedCheck.size !== filteredSuburbs.length) {
  const unreached = filteredSuburbs.filter(s => !visitedCheck.has(s.id)).map(s => s.id);
  console.error('Unreached planning areas:', unreached);
  process.exit(1);
}

// 4. Generate Daily Challenges (2025-2030)
const allIds = filteredSuburbs.map(s => s.id).sort();
function seededRng(seedStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const updatedChallenges = {};
const startDate = new Date('2025-01-01T00:00:00Z');
const endDate = new Date('2030-12-31T00:00:00Z');
let d = new Date(startDate);

while (d <= endDate) {
  const dateStr = d.toISOString().split('T')[0];
  const rng = seededRng(`singapore-${dateStr}-canonical-v1`);

  let chosenStart = null;
  let chosenTarget = null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const startIdx = Math.floor(rng() * allIds.length);
    const sId = allIds[startIdx];

    const distMap = new Map();
    distMap.set(sId, 0);
    const q = [sId];
    while (q.length > 0) {
      const cur = q.shift();
      const curDist = distMap.get(cur);
      for (const n of filteredAdjacency[cur] || []) {
        if (!distMap.has(n)) {
          distMap.set(n, curDist + 1);
          q.push(n);
        }
      }
    }

    const candidates = [];
    allIds.forEach(id => {
      const dist = distMap.get(id);
      if (dist === 6 || dist === 7) {
        candidates.push(id);
      }
    });

    if (candidates.length > 0) {
      candidates.sort();
      const targetIdx = Math.floor(rng() * candidates.length);
      chosenStart = sId;
      chosenTarget = candidates[targetIdx];
      break;
    }
  }

  if (!chosenStart || !chosenTarget) {
    chosenStart = 'downtown-core';
    chosenTarget = 'tuas';
  }

  const testPath = findShortestPath(chosenStart, chosenTarget, filteredAdjacency);
  const steps = testPath.length - 2;
  if (steps !== 5 && steps !== 6) {
    console.error(`Invalid distance for ${dateStr}: got ${steps} steps`);
    process.exit(1);
  }

  updatedChallenges[dateStr] = [chosenStart, chosenTarget];
  d.setUTCDate(d.getUTCDate() + 1);
}

// Write back files
const suburbsFileContent = `import { SuburbData } from '../types';

export const SINGAPORE_SUBURBS: SuburbData[] = ${JSON.stringify(filteredSuburbs, null, 2)};

export const SINGAPORE_STRAIT_SHORELINE: [number, number][] = ${JSON.stringify(SINGAPORE_STRAIT_SHORELINE, null, 2)};

export const JOHOR_STRAIT_SHORELINE: [number, number][] = ${JSON.stringify(JOHOR_STRAIT_SHORELINE, null, 2)};

export const SINGAPORE_RIVER_GIS: [number, number][] = ${JSON.stringify(SINGAPORE_RIVER_GIS, null, 2)};

export const KALLANG_RIVER_GIS: [number, number][] = ${JSON.stringify(KALLANG_RIVER_GIS, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/singaporeSuburbs.ts'), suburbsFileContent);
console.log('Updated src/data/singaporeSuburbs.ts');

const geoDataFileContent = `export const SINGAPORE_SUBURB_BOUNDARIES: Record<string, [number, number][]> = ${JSON.stringify(filteredBoundaries, null, 2)};

export const SINGAPORE_SUBURB_CENTERS: Record<string, [number, number]> = ${JSON.stringify(filteredCenters, null, 2)};

export const SINGAPORE_SUBURB_ADJACENCY: Record<string, string[]> = ${JSON.stringify(filteredAdjacency, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/singaporeGeoData.ts'), geoDataFileContent);
console.log('Updated src/data/singaporeGeoData.ts');

const challengesFileContent = `/**
 * Canonical Deterministic Daily Challenges for Singapore (2025-2030).
 * Guarantees every single day's puzzle is 100% immutable and strictly solvable.
 */
export const CANONICAL_SINGAPORE_DAILY_CHALLENGES: Record<string, [string, string]> = ${JSON.stringify(updatedChallenges, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/canonicalSingaporeDailyChallenges.ts'), challengesFileContent);
console.log('Updated src/data/canonicalSingaporeDailyChallenges.ts');

console.log('🎉 Successfully generated clean Singapore dataset and canonical challenges!');
