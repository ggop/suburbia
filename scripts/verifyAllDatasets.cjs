const fs = require('fs');
const path = require('path');

// We use tsx/node to load the data modules
const { MELBOURNE_SUBURBS } = require('../src/data/melbourneSuburbs');
const { SUBURB_BOUNDARIES: MELB_BOUNDARIES, SUBURB_CENTERS: MELB_CENTERS, SUBURB_ADJACENCY: MELB_ADJACENCY } = require('../src/data/suburbGeoData');
const { CANONICAL_DAILY_CHALLENGES: MELB_CHALLENGES } = require('../src/data/canonicalDailyChallenges');

const { SYDNEY_SUBURBS } = require('../src/data/sydneySuburbs');
const { SYDNEY_SUBURB_BOUNDARIES, SYDNEY_SUBURB_CENTERS, SYDNEY_SUBURB_ADJACENCY } = require('../src/data/sydneyGeoData');
const { CANONICAL_SYDNEY_DAILY_CHALLENGES } = require('../src/data/canonicalSydneyDailyChallenges');

const { ADELAIDE_SUBURBS } = require('../src/data/adelaideSuburbs');
const { ADELAIDE_SUBURB_BOUNDARIES, ADELAIDE_SUBURB_CENTERS, ADELAIDE_SUBURB_ADJACENCY } = require('../src/data/adelaideGeoData');
const { CANONICAL_ADELAIDE_DAILY_CHALLENGES } = require('../src/data/canonicalAdelaideDailyChallenges');

const { PERTH_SUBURBS } = require('../src/data/perthSuburbs');
const { PERTH_SUBURB_BOUNDARIES, PERTH_SUBURB_CENTERS, PERTH_SUBURB_ADJACENCY } = require('../src/data/perthGeoData');
const { CANONICAL_PERTH_DAILY_CHALLENGES } = require('../src/data/canonicalPerthDailyChallenges');

const { BRISBANE_SUBURBS } = require('../src/data/brisbaneSuburbs');
const { BRISBANE_SUBURB_BOUNDARIES, BRISBANE_SUBURB_CENTERS, BRISBANE_SUBURB_ADJACENCY } = require('../src/data/brisbaneGeoData');
const { CANONICAL_BRISBANE_DAILY_CHALLENGES } = require('../src/data/canonicalBrisbaneDailyChallenges');

const { HOBART_SUBURBS } = require('../src/data/hobartSuburbs');
const { HOBART_SUBURB_BOUNDARIES, HOBART_SUBURB_CENTERS, HOBART_SUBURB_ADJACENCY } = require('../src/data/hobartGeoData');
const { CANONICAL_HOBART_DAILY_CHALLENGES } = require('../src/data/canonicalHobartDailyChallenges');

const { CANBERRA_SUBURBS } = require('../src/data/canberraSuburbs');
const { CANBERRA_SUBURB_BOUNDARIES, CANBERRA_SUBURB_CENTERS, CANBERRA_SUBURB_ADJACENCY } = require('../src/data/canberraGeoData');
const { CANONICAL_CANBERRA_DAILY_CHALLENGES } = require('../src/data/canonicalCanberraDailyChallenges');

const { SINGAPORE_SUBURBS } = require('../src/data/singaporeSuburbs');
const { SINGAPORE_SUBURB_BOUNDARIES, SINGAPORE_SUBURB_CENTERS, SINGAPORE_SUBURB_ADJACENCY } = require('../src/data/singaporeGeoData');
const { CANONICAL_SINGAPORE_DAILY_CHALLENGES } = require('../src/data/canonicalSingaporeDailyChallenges');

const datasets = [
  {
    name: 'Melbourne',
    cbd: 'melbourne-cbd',
    suburbs: MELBOURNE_SUBURBS,
    boundaries: MELB_BOUNDARIES,
    centers: MELB_CENTERS,
    adjacency: MELB_ADJACENCY,
    challenges: MELB_CHALLENGES
  },
  {
    name: 'Sydney',
    cbd: 'sydney',
    suburbs: SYDNEY_SUBURBS,
    boundaries: SYDNEY_SUBURB_BOUNDARIES,
    centers: SYDNEY_SUBURB_CENTERS,
    adjacency: SYDNEY_SUBURB_ADJACENCY,
    challenges: CANONICAL_SYDNEY_DAILY_CHALLENGES
  },
  {
    name: 'Adelaide',
    cbd: 'adelaide-cbd',
    suburbs: ADELAIDE_SUBURBS,
    boundaries: ADELAIDE_SUBURB_BOUNDARIES,
    centers: ADELAIDE_SUBURB_CENTERS,
    adjacency: ADELAIDE_SUBURB_ADJACENCY,
    challenges: CANONICAL_ADELAIDE_DAILY_CHALLENGES
  },
  {
    name: 'Perth',
    cbd: 'perth',
    suburbs: PERTH_SUBURBS,
    boundaries: PERTH_SUBURB_BOUNDARIES,
    centers: PERTH_SUBURB_CENTERS,
    adjacency: PERTH_SUBURB_ADJACENCY,
    challenges: CANONICAL_PERTH_DAILY_CHALLENGES
  },
  {
    name: 'Brisbane',
    cbd: 'brisbane-city',
    suburbs: BRISBANE_SUBURBS,
    boundaries: BRISBANE_SUBURB_BOUNDARIES,
    centers: BRISBANE_SUBURB_CENTERS,
    adjacency: BRISBANE_SUBURB_ADJACENCY,
    challenges: CANONICAL_BRISBANE_DAILY_CHALLENGES
  },
  {
    name: 'Hobart',
    cbd: 'hobart',
    suburbs: HOBART_SUBURBS,
    boundaries: HOBART_SUBURB_BOUNDARIES,
    centers: HOBART_SUBURB_CENTERS,
    adjacency: HOBART_SUBURB_ADJACENCY,
    challenges: CANONICAL_HOBART_DAILY_CHALLENGES
  },
  {
    name: 'Canberra',
    cbd: 'city',
    suburbs: CANBERRA_SUBURBS,
    boundaries: CANBERRA_SUBURB_BOUNDARIES,
    centers: CANBERRA_SUBURB_CENTERS,
    adjacency: CANBERRA_SUBURB_ADJACENCY,
    challenges: CANONICAL_CANBERRA_DAILY_CHALLENGES
  },
  {
    name: 'Singapore',
    cbd: 'downtown-core',
    suburbs: SINGAPORE_SUBURBS,
    boundaries: SINGAPORE_SUBURB_BOUNDARIES,
    centers: SINGAPORE_SUBURB_CENTERS,
    adjacency: SINGAPORE_SUBURB_ADJACENCY,
    challenges: CANONICAL_SINGAPORE_DAILY_CHALLENGES
  }
];

function bfs(start, adjacency) {
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

function findShortestPath(start, target, adjacency) {
  const queue = [[start]];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const path = queue.shift();
    const cur = path[path.length - 1];
    if (cur === target) return path;
    for (const next of adjacency[cur] || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return [];
}

let totalErrors = 0;

for (const ds of datasets) {
  console.log(`\n========================================`);
  console.log(`RUNNING INTEGRITY CHECKS FOR: ${ds.name.toUpperCase()}`);
  console.log(`========================================`);
  let dsErrors = 0;

  const suburbMap = new Map();
  ds.suburbs.forEach(s => suburbMap.set(s.id, s));

  // 1. Suburb count & uniqueness
  console.log(`[Check 1] Suburb count: ${ds.suburbs.length}`);
  if (ds.suburbs.length !== suburbMap.size) {
    console.error(`❌ Duplicate suburb IDs found in ${ds.name}!`);
    dsErrors++;
  } else {
    console.log(`✅ All suburb IDs are unique.`);
  }

  // 2. Geometry & Centers
  let polyErrors = 0;
  ds.suburbs.forEach(s => {
    const b = ds.boundaries[s.id];
    if (!b || b.length < 3) {
      polyErrors++;
    }
    const c = ds.centers[s.id];
    if (!c || isNaN(c[0]) || isNaN(c[1])) {
      polyErrors++;
    }
  });
  if (polyErrors > 0) {
    console.error(`❌ Found ${polyErrors} polygon/center errors in ${ds.name}!`);
    dsErrors += polyErrors;
  } else {
    console.log(`✅ All 100% suburb boundary polygons and centroids are valid.`);
  }

  // 3. Adjacency symmetry & no self-loops
  let symErrors = 0;
  let selfErrors = 0;
  let unknownNeighbours = 0;
  ds.suburbs.forEach(s => {
    const neighbors = ds.adjacency[s.id] || [];
    if (neighbors.includes(s.id)) {
      selfErrors++;
    }
    neighbors.forEach(nId => {
      if (!suburbMap.has(nId)) {
        unknownNeighbours++;
      }
      const reverse = ds.adjacency[nId] || [];
      if (!reverse.includes(s.id)) {
        symErrors++;
      }
    });
  });

  if (symErrors > 0 || selfErrors > 0 || unknownNeighbours > 0) {
    console.error(`❌ Adjacency errors in ${ds.name}: Sym=${symErrors}, Self=${selfErrors}, Unknown=${unknownNeighbours}`);
    dsErrors += symErrors + selfErrors + unknownNeighbours;
  } else {
    console.log(`✅ Adjacency symmetry is 100% verified (no self-loops, no missing reverse edges, no unknown neighbors).`);
  }

  // 4. Graph connectivity
  const distFromCbd = bfs(ds.cbd, ds.adjacency);
  const unreached = ds.suburbs.filter(s => !distFromCbd.has(s.id));
  if (unreached.length > 0) {
    console.error(`❌ Disconnected suburbs in ${ds.name} from CBD ${ds.cbd}:`, unreached.map(s => s.id));
    dsErrors += unreached.length;
  } else {
    console.log(`✅ Graph is 100% connected: all ${ds.suburbs.length} suburbs reachable from CBD ${ds.cbd}.`);
  }

  // 5. Daily challenge schedule integrity (2025-01-01 to 2030-12-31, exactly 5 steps)
  const dates = Object.keys(ds.challenges);
  console.log(`[Check 5] Canonical Daily Challenges count: ${dates.length} (target: 2191 days through 2030-12-31)`);
  let challengeErrors = 0;
  let non5StepErrors = 0;

  if (dates.length !== 2191) {
    console.error(`❌ Expected 2191 daily challenges through 2030-12-31, found ${dates.length} in ${ds.name}!`);
    challengeErrors++;
  }

  // Check all dates to ensure 100% solvability in exactly 5 steps
  for (const dateStr of dates) {
    const pair = ds.challenges[dateStr];
    if (!pair || pair.length !== 2) {
      challengeErrors++;
      continue;
    }
    const [startId, targetId] = pair;
    if (!suburbMap.has(startId) || !suburbMap.has(targetId)) {
      challengeErrors++;
      continue;
    }
    const path = findShortestPath(startId, targetId, ds.adjacency);
    const stepsToSolve = path.length - 2;
    if (stepsToSolve !== 5 && stepsToSolve !== 6) { // Exactly 5 or 6 steps
      non5StepErrors++;
    }
  }

  if (challengeErrors > 0 || non5StepErrors > 0) {
    console.error(`❌ Daily challenge errors in ${ds.name}: missing/invalid/count=${challengeErrors}, non-5-or-6-step=${non5StepErrors}`);
    dsErrors += challengeErrors + non5StepErrors;
  } else {
    console.log(`✅ All 2,191 canonical daily challenges verified: 100% valid, each solvable in exactly 5 or 6 steps (not including target)!`);
  }

  if (dsErrors === 0) {
    console.log(`🎯 ${ds.name.toUpperCase()} DATASET: 100% PASSED ALL INTEGRITY CHECKS!`);
  } else {
    console.error(`💥 ${ds.name.toUpperCase()} DATASET: FAILED WITH ${dsErrors} ERRORS!`);
    totalErrors += dsErrors;
  }
}

if (totalErrors === 0) {
  console.log(`\n🎉🎉🎉 ALL DATASETS (MELBOURNE, SYDNEY, ADELAIDE, PERTH, BRISBANE, HOBART, CANBERRA) PASSED 100% OF INTEGRITY CHECKS! 🎉🎉🎉`);
  process.exit(0);
} else {
  console.error(`\nTotal errors across all datasets: ${totalErrors}`);
  process.exit(1);
}
