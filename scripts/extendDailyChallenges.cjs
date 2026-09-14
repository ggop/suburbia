const fs = require('fs');
const path = require('path');

// Seeded PRNG for reproducible generation
function xmur3(str) {
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

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(seedStr) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

function bfsDistances(start, adjacency) {
  const dist = new Map();
  dist.set(start, 0);
  const q = [start];
  while (q.length > 0) {
    const cur = q.shift();
    const d = dist.get(cur);
    for (const n of adjacency[cur] || []) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

function getShortestPath(start, target, adjacency) {
  const q = [[start]];
  const seen = new Set([start]);
  while (q.length > 0) {
    const path = q.shift();
    const cur = path[path.length - 1];
    if (cur === target) return path;
    for (const next of adjacency[cur] || []) {
      if (!seen.has(next)) {
        seen.add(next);
        q.push([...path, next]);
      }
    }
  }
  return [];
}

// Generate full dates array from 2025-01-01 to 2030-12-31
function getAllDates() {
  const dates = [];
  const start = new Date('2025-01-01T00:00:00Z');
  const end = new Date('2030-12-31T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const allDates = getAllDates();
console.log(`Targeting ${allDates.length} days (2025-01-01 to 2030-12-31)`);

const targets = [
  {
    cityKey: 'melbourne',
    exportName: 'CANONICAL_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalDailyChallenges.ts',
    suburbs: require('../src/data/melbourneSuburbs').MELBOURNE_SUBURBS,
    adjacency: require('../src/data/suburbGeoData').SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalDailyChallenges').CANONICAL_DAILY_CHALLENGES
  },
  {
    cityKey: 'sydney',
    exportName: 'CANONICAL_SYDNEY_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalSydneyDailyChallenges.ts',
    suburbs: require('../src/data/sydneySuburbs').SYDNEY_SUBURBS,
    adjacency: require('../src/data/sydneyGeoData').SYDNEY_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalSydneyDailyChallenges').CANONICAL_SYDNEY_DAILY_CHALLENGES
  },
  {
    cityKey: 'adelaide',
    exportName: 'CANONICAL_ADELAIDE_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalAdelaideDailyChallenges.ts',
    suburbs: require('../src/data/adelaideSuburbs').ADELAIDE_SUBURBS,
    adjacency: require('../src/data/adelaideGeoData').ADELAIDE_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalAdelaideDailyChallenges').CANONICAL_ADELAIDE_DAILY_CHALLENGES
  },
  {
    cityKey: 'perth',
    exportName: 'CANONICAL_PERTH_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalPerthDailyChallenges.ts',
    suburbs: require('../src/data/perthSuburbs').PERTH_SUBURBS,
    adjacency: require('../src/data/perthGeoData').PERTH_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalPerthDailyChallenges').CANONICAL_PERTH_DAILY_CHALLENGES
  },
  {
    cityKey: 'brisbane',
    exportName: 'CANONICAL_BRISBANE_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalBrisbaneDailyChallenges.ts',
    suburbs: require('../src/data/brisbaneSuburbs').BRISBANE_SUBURBS,
    adjacency: require('../src/data/brisbaneGeoData').BRISBANE_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalBrisbaneDailyChallenges').CANONICAL_BRISBANE_DAILY_CHALLENGES
  },
  {
    cityKey: 'hobart',
    exportName: 'CANONICAL_HOBART_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalHobartDailyChallenges.ts',
    suburbs: require('../src/data/hobartSuburbs').HOBART_SUBURBS,
    adjacency: require('../src/data/hobartGeoData').HOBART_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalHobartDailyChallenges').CANONICAL_HOBART_DAILY_CHALLENGES
  },
  {
    cityKey: 'canberra',
    exportName: 'CANONICAL_CANBERRA_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalCanberraDailyChallenges.ts',
    suburbs: require('../src/data/canberraSuburbs').CANBERRA_SUBURBS,
    adjacency: require('../src/data/canberraGeoData').CANBERRA_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalCanberraDailyChallenges').CANONICAL_CANBERRA_DAILY_CHALLENGES
  },
  {
    cityKey: 'chennai',
    exportName: 'CANONICAL_CHENNAI_DAILY_CHALLENGES',
    fileRel: '../src/data/canonicalChennaiDailyChallenges.ts',
    suburbs: require('../src/data/chennaiSuburbs').CHENNAI_SUBURBS,
    adjacency: require('../src/data/chennaiGeoData').CHENNAI_SUBURB_ADJACENCY,
    existing: require('../src/data/canonicalChennaiDailyChallenges').CANONICAL_CHENNAI_DAILY_CHALLENGES
  }
];

for (const t of targets) {
  console.log(`\nProcessing ${t.cityKey.toUpperCase()}...`);
  const allIds = t.suburbs.map(s => s.id).sort();
  const newChallenges = {};

  // Pre-calculate 5-or-6-step candidate pairs (dist 6 -> 5 steps, dist 7 -> 6 steps)
  const candidateMap = new Map();
  for (const id of allIds) {
    const distMap = bfsDistances(id, t.adjacency);
    const reachableAt5or6 = allIds.filter(targetId => {
      const d = distMap.get(targetId);
      return d === 6 || d === 7;
    });
    if (reachableAt5or6.length > 0) {
      candidateMap.set(id, reachableAt5or6);
    }
  }
  const validStartIds = Array.from(candidateMap.keys()).sort();
  console.log(`  Suburbs with at least one 5-or-6-step target: ${validStartIds.length} / ${allIds.length}`);

  let preservedCount = 0;
  let generatedCount = 0;

  for (const dateStr of allDates) {
    const existingPair = t.existing ? t.existing[dateStr] : null;
    let chosenPair = null;

    if (existingPair && existingPair.length === 2) {
      const [start, target] = existingPair;
      if (allIds.includes(start) && allIds.includes(target)) {
        const path = getShortestPath(start, target, t.adjacency);
        const steps = path.length - 2;
        if (steps === 5 || steps === 6) { // Exactly 5 or 6 steps
          chosenPair = [start, target];
          preservedCount++;
        }
      }
    }

    if (!chosenPair) {
      // Deterministically pick a 5-or-6-step pair
      const rng = getRng(`${t.cityKey}-daily-challenge-${dateStr}`);
      const sIdx = Math.floor(rng() * validStartIds.length);
      const startId = validStartIds[sIdx];
      const validTargets = candidateMap.get(startId);
      const tIdx = Math.floor(rng() * validTargets.length);
      const targetId = validTargets[tIdx];

      const checkPath = getShortestPath(startId, targetId, t.adjacency);
      const steps = checkPath.length - 2;
      if (steps !== 5 && steps !== 6) {
        throw new Error(`Integrity bug: ${startId} -> ${targetId} is not 5 or 6 steps in ${t.cityKey}`);
      }
      chosenPair = [startId, targetId];
      generatedCount++;
    }

    newChallenges[dateStr] = chosenPair;
  }

  console.log(`  Total dates: ${Object.keys(newChallenges).length} (preserved: ${preservedCount}, newly generated: ${generatedCount})`);

  // Write file
  const fileContent = `/**\n * CANONICAL ${t.cityKey.toUpperCase()} DAILY CHALLENGES (2025-01-01 to 2030-12-31)\n * 2,191 dates pre-computed & locked. Guarantees 100% stable daily challenges\n * across all deployments and environments worldwide. Each puzzle is strictly solvable in 5 or 6 steps.\n */\n\nexport const ${t.exportName}: Record<string, [string, string]> = ${JSON.stringify(newChallenges, null, 2)};\n`;

  const outPath = path.join(__dirname, t.fileRel);
  fs.writeFileSync(outPath, fileContent, 'utf-8');
  console.log(`  Wrote ${outPath}`);
}

console.log('\nAll city canonical daily challenges successfully updated to Dec 31 2030!');
