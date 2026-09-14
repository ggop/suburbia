const fs = require('fs');
const path = require('path');

console.log('=== STEP 1: LOADING QLD POSTCODES & CADASTRAL GEOJSON ===');

// 1. Postcodes
const postLines = fs.readFileSync('/tmp/au_postcodes.csv', 'utf8').split('\n');
const postHeader = postLines[0].split(',').map(s => s.replace(/\"/g, '').trim());
const locIdx = postHeader.indexOf('locality');
const stateIdx = postHeader.indexOf('state');
const postIdx = postHeader.indexOf('postcode');
const sa4Idx = postHeader.indexOf('sa4name');
const sa3Idx = postHeader.indexOf('sa3name');
const lgaIdx = postHeader.indexOf('lgaregion');

const allowedLGAs = new Set(['Brisbane', 'Moreton Bay', 'Redland', 'Logan', 'Ipswich']);

const postMap = new Map();
for (let i = 1; i < postLines.length; i++) {
  if (!postLines[i].trim()) continue;
  const parts = postLines[i].split(',').map(s => s.replace(/^\"|\"$/g, '').trim());
  if (parts[stateIdx] === 'QLD') {
    const loc = parts[locIdx].toUpperCase().trim();
    if (!postMap.has(loc)) {
      let region = 'Greater Brisbane';
      const sa4 = parts[sa4Idx] || '';
      const lga = parts[lgaIdx] || '';

      if (sa4.includes('Inner')) region = 'Inner Brisbane';
      else if (sa4.includes('North')) region = 'North Brisbane';
      else if (sa4.includes('South')) region = 'South Brisbane';
      else if (sa4.includes('East')) region = 'East & Bayside';
      else if (sa4.includes('West')) region = 'Western Suburbs';
      else if (lga === 'Moreton Bay') region = 'Moreton Bay Region';
      else if (lga === 'Redland') region = 'Redland Bayside';
      else if (lga === 'Logan') region = 'Logan City';
      else if (lga === 'Ipswich') region = 'Ipswich Region';

      postMap.set(loc, {
        name: parts[locIdx].trim(),
        postcode: parts[postIdx],
        lga: parts[lgaIdx],
        region: region
      });
    }
  }
}

// 2. QLD Cadastre GeoJSON
const geoData = JSON.parse(fs.readFileSync('/tmp/suburb-2-qld.geojson', 'utf8'));
const BRISBANE_CBD = { lat: -27.4698, lng: 153.0251 };

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function toTitleCase(str) {
  return str.toLowerCase().split(' ').map(word => {
    if (word === 'cbd') return 'CBD';
    if (word === 'uq') return 'UQ';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

// Simplify ring for crisp, high-performance SVG rendering
function simplifyRing(ring, tolerance = 0.0006) {
  if (ring.length <= 35) return ring;
  const result = [ring[0]];
  let prev = ring[0];
  for (let i = 1; i < ring.length - 1; i++) {
    const p = ring[i];
    const dx = p[0] - prev[0];
    const dy = p[1] - prev[1];
    if (dx * dx + dy * dy >= tolerance * tolerance) {
      result.push(p);
      prev = p;
    }
  }
  result.push(ring[ring.length - 1]);
  return result;
}

// Prominent historical facts for Brisbane suburbs
const HISTORICAL_FACTS = {
  'brisbane-city': "Originally known as Meanjin to the Turrbal and Yuggera peoples; founded as the Moreton Bay penal settlement in 1824 and now Queensland's premier subtropical capital.",
  'south-brisbane': "Home to the world-renowned South Bank Parklands, Streets Beach (Australia's only inner-city man-made beach), Queensland Cultural Centre, and host precinct for Expo 88.",
  'fortitude-valley': "Queensland's designated live-music and nightlife hub since the late 19th century, featuring vibrant Chinatown Mall, Brunswick Street, and heritage brick warehouses.",
  'new-farm': "Picturesque riverside suburb renowned for the iconic Brisbane Powerhouse arts centre, historic New Farm Park rose gardens, and leafy jacaranda tree-lined avenues.",
  'kangaroo-point': "Famous for the heritage-listed Kangaroo Point Cliffs overlooking the city skyline, the landmark Story Bridge (completed 1940), and St Mary's Anglican Church (1873).",
  'west-end': "Brisbane's vibrant bohemian heart, celebrated for Boundary Street Greek and global dining, weekend markets, and lively alternative arts culture.",
  'teneriffe': "Historic woolstore precinct along the Brisbane River revitalised into luxury heritage loft residences, craft microbreweries, and scenic riverwalks.",
  'newstead': "Home to Newstead House (built 1846), Brisbane's oldest surviving residential home, and the modern Gasworks Plaza dining and cultural precinct.",
  'spring-hill': "Historic inner-city hill suburb established in the 1850s, home to the heritage Spring Hill Baths (1886) and the landmark 1828 Old Windmill tower.",
  'milton': "Home to Suncorp Stadium (Lang Park, the spiritual home of Queensland rugby league) and the iconic Castlemaine Perkins XXXX Brewery established in 1878.",
  'paddington': "Renowned for its steep, winding streets lined with classic timber 'Queenslander' architecture, boutique antique stores, and Latrobe Terrace cafes.",
  'st-lucia': "Nestled in a dramatic bend of the Brisbane River, home to the sandstone Great Court of the University of Queensland (founded 1909).",
  'toowong': "Crucial western transport hub centered on Toowong Village, the historic Regatta Hotel (1874) on the river, and the vast Toowong Cemetery.",
  'indooroopilly': "Major retail center featuring Indooroopilly Shopping Centre and the historic Walter Taylor suspension bridge (1936) with residential towers inside its pylons.",
  'woolloongabba': "Famous worldwide for The Gabba (Brisbane Cricket Ground, host of legendary cricket and AFL matches), antique shops, and historic German immigrant roots.",
  'east-brisbane': "Riverside enclave home to the Church of England Grammar School (Churchie, founded 1912) and classic turn-of-the-century worker's cottages.",
  'bulimba': "Vibrant riverside precinct centered on fashionable Oxford Street cafes, historic ferry terminal (1922), and Bulimba Memorial Park.",
  'hawthorne': "Affluent riverside pocket known for heritage Queenslander homes, Hawthorne Cinema (operating since the 1940s), and leafy riverfront parks.",
  'hamilton': "Prestigious north-bank suburb known for Kingsford Smith Drive riverwalk, Portside Wharf cruise terminal, and the historic 19th-century mansions of Hamilton Hill.",
  'ascot': "Synonymous with thoroughbred racing, home to Eagle Farm Racecourse (1863) and Doomben Racecourse, centered on the grand Poinciana-shaded Racecourse Road.",
  'chermside': "The economic and retail capital of northern Brisbane, home to Westfield Chermside (Australia's second-largest shopping complex) and Kedron Brook parklands.",
  'sunnybank': "Renowned as Brisbane's premier multicultural and Asian culinary destination, centered on Market Square and Sunnybank Plaza.",
  'mount-coot-tha': "Home to Brisbane's highest peak (287m), offering breathtaking panoramic views across the city to Moreton Bay, the Brisbane Botanic Gardens, and Sir Thomas Brisbane Planetarium.",
  'sandgate': "Historic seaside resort town connected by rail in 1882, beloved for its breezy foreshore promenade, heritage bath pavilions, and Shorncliffe Pier.",
  'redcliffe': "Site of Queensland's first European settlement in 1824, celebrated for Suttons Beach, Bee Gees Way commemorating the pop trio's childhood home, and Redcliffe Jetty.",
  'wynnum': "Heritage bayside enclave featuring the heritage-listed Wynnum Wading Pool (1932), picturesque foreshore walk, and sweeping views of Moreton Bay.",
  'manly': "Moreton Bay boating hub home to the Southern Hemisphere's largest marina harbour, Manly Harbour Village, and regular yacht regattas.",
  'cleveland': "Historic port and capital of Redland City, home to the heritage 1864 Cleveland Point Lighthouse and ferry gateway to North Stradbroke Island.",
  'ipswich': "Queensland's oldest provincial city, founded in 1827 as a limestone mining outpost and rich in historic Victorian architecture and railway workshop heritage.",
  'coorparoo': "Leafy inner-east suburb featuring heritage estates, Queen Alexandra Home, and sweeping views from elevated ridges towards the Brisbane CBD.",
  'carindale': "Major eastern suburban hub centered on Westfield Carindale and the picturesque Belmont Hills nature reserves.",
  'ashgrove': "Known for the signature 'Ashgrovian' timber Queenslander architectural style developed in the 1920s, bordered by Enoggera Creek.",
  'albion': "Historic racecourse and industrial heritage suburb, home to the Albion Park Raceway and the historic Queensland Golf Club origins.",
  'eagle-farm': "Crucial industrial and aviation district; home to historic Brisbane Airport runways and the Sir Leo Hielscher Gateway Bridges.",
  'nundah': "Site of Queensland's first free European settlement established by German Lutheran missionaries in 1838 (Zion's Hill), centered on Nundah Village.",
  'clayfield': "Prestigious inner-north suburb known for grand timber Queenslander homes, high-ranking private schools, and clay-rich soils from early brickworks.",
  'morningside': "Named after an estate called Morning Star; bustling inner-east pocket with heritage worker cottages and thriving food precincts along Wynnum Road.",
  'chelmer': "Leafy riverside peninsula suburb famous for the Walter Taylor Bridge and the iconic Honour Avenue camphor laurel tree memorial planted in 1918.",
  'graceville': "Charming western suburb renowned for its heritage-listed Regal Cinema (1938), riverside parklands, and quiet tree-lined avenues.",
  'sherwood': "Historic river suburb home to the Sherwood Arboretum (founded 1925), featuring over 1,000 native Australian trees along the Brisbane River.",
  'corinda': "Established in the late 19th century along the Brisbane River, home to historic Francis Lookout and Saint Aidan's Anglican Girls' School.",
  'moorooka': "Home to the famous 'Magic Mile' auto precinct on Ipswich Road and scenic Toohey Forest conservation reserve.",
  'taringa': "Western educational and residential enclave between UQ and Indooroopilly, meaning 'place of stones' in the Indigenous Yuggera language.",
  'kelvin-grove': "Home to the Queensland University of Technology (QUT) Kelvin Grove campus and the lively weekly Saturday Kelvin Grove Village Markets.",
  'herston': "Major biomedical research and health precinct, home to the Royal Brisbane and Women's Hospital (RBWH) and the historic Victoria Park golf greens.",
  'bowen-hills': "Historic showgrounds hub home to the Brisbane Exhibition Ground, hosting the iconic annual 'Ekka' (Royal Queensland Show) since 1876."
};

const rawSuburbs = [];
const seenIds = new Set();

for (const f of geoData.features) {
  const name = f.properties.qld_loca_2 ? f.properties.qld_loca_2.toUpperCase().trim() : '';
  if (!name) continue;

  let ring = [];
  if (f.geometry.type === 'Polygon') {
    ring = f.geometry.coordinates[0];
  } else if (f.geometry.type === 'MultiPolygon') {
    let best = f.geometry.coordinates[0][0];
    let maxLen = best.length;
    for (const poly of f.geometry.coordinates) {
      if (poly[0] && poly[0].length > maxLen) {
        maxLen = poly[0].length;
        best = poly[0];
      }
    }
    ring = best;
  }
  if (!ring || ring.length < 3) continue;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    sumX += x;
    sumY += y;
  }
  const cLat = sumY / ring.length;
  const cLng = sumX / ring.length;
  const dist = haversineKm(BRISBANE_CBD.lat, BRISBANE_CBD.lng, cLat, cLng);

  const pData = postMap.get(name);
  const lga = pData ? pData.lga : '';

  // Include suburbs within 36km from CBD belonging to the 5 Greater Brisbane councils, or Brisbane City
  if ((allowedLGAs.has(lga) || name === 'BRISBANE CITY') && dist <= 36) {
    const id = slugify(name);
    if (!seenIds.has(id)) {
      seenIds.add(id);
      const simplified = simplifyRing(ring);
      rawSuburbs.push({
        id,
        name: toTitleCase(pData ? pData.name : name),
        lat: Math.round(cLat * 100000) / 100000,
        lng: Math.round(cLng * 100000) / 100000,
        postcode: pData ? pData.postcode : '4000',
        region: pData ? pData.region : 'Greater Brisbane',
        ring: simplified.map(([x, y]) => [Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000]),
        bbox: [minX, minY, maxX, maxY],
        cLat,
        cLng
      });
    }
  }
}

// Sort alphabetically by ID for absolute deterministic consistency
rawSuburbs.sort((a, b) => a.id.localeCompare(b.id));
console.log(`Loaded ${rawSuburbs.length} valid Greater Brisbane metropolitan suburbs.`);

// Compute Shoelace polygon area (km²)
function polygonAreaKm2(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += ring[i][0] * ring[j][1];
    area -= ring[j][0] * ring[i][1];
  }
  area = Math.abs(area) / 2;
  const midLat = ring[0][1];
  const kmPerDegLat = 111.0;
  const kmPerDegLng = 111.0 * Math.cos(midLat * Math.PI / 180);
  return area * kmPerDegLat * kmPerDegLng;
}

// Compute Adjacency
const adjacency = {};
rawSuburbs.forEach(s => adjacency[s.id] = new Set());

for (let i = 0; i < rawSuburbs.length; i++) {
  const s1 = rawSuburbs[i];
  for (let j = i + 1; j < rawSuburbs.length; j++) {
    const s2 = rawSuburbs[j];
    const b1 = s1.bbox, b2 = s2.bbox;
    if (b1[0] - 0.001 > b2[2] || b1[2] + 0.001 < b2[0] ||
        b1[1] - 0.001 > b2[3] || b1[3] + 0.001 < b2[1]) continue;

    let touches = false;
    for (const p1 of s1.ring) {
      for (const p2 of s2.ring) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        if (dx * dx + dy * dy < 0.000003) {
          touches = true;
          break;
        }
      }
      if (touches) break;
    }
    if (touches) {
      adjacency[s1.id].add(s2.id);
      adjacency[s2.id].add(s1.id);
    }
  }
}

// Major bridge, ferry, and peninsula links across the Brisbane River and bays
const MANUAL_CONNECTIONS = [
  // Story Bridge
  ['brisbane-city', 'kangaroo-point'],
  ['fortitude-valley', 'kangaroo-point'],
  // Captain Cook Bridge / Pacific Motorway
  ['brisbane-city', 'woolloongabba'],
  // Victoria Bridge / Kurilpa Bridge / Goodwill Bridge
  ['brisbane-city', 'south-brisbane'],
  // William Jolly / Go Between Bridge
  ['milton', 'south-brisbane'],
  ['milton', 'west-end'],
  // Eleanor Schonell Bridge (UQ Green Bridge)
  ['st-lucia', 'dutton-park'],
  ['st-lucia', 'highgate-hill'],
  // Walter Taylor Bridge & Railway Bridge
  ['indooroopilly', 'chelmer'],
  // Centenary Bridge
  ['jindalee', 'kenmore'],
  ['jindalee', 'fig-tree-pocket'],
  ['sinnamon-park', 'fig-tree-pocket'],
  // Gateway Bridges (Sir Leo Hielscher Bridges)
  ['eagle-farm', 'murarrie'],
  ['pinkenba', 'murarrie'],
  // Cross-river ferries
  ['bulimba', 'teneriffe'],
  ['bulimba', 'hamilton'],
  ['new-farm', 'norman-park'],
  ['new-farm', 'hawthorne'],
  ['new-farm', 'kangaroo-point'],
  ['hamilton', 'morningside'],
  // Bramble Bay / Redcliffe Peninsula bridges (Houghton Hwy & Ted Smout Bridge)
  ['brighton', 'clontarf'],
  ['sandgate', 'woody-point'],
  // Moggill Ferry across the upper Brisbane River
  ['moggill', 'riverview'],
  ['moggill', 'karalee'],
  // Coochiemudlo Island ferry
  ['victoria-point', 'coochiemudlo-island'],
  // Port of Brisbane / Fisherman Island link
  ['lytton', 'port-of-brisbane'],
  ['wynnum-north', 'port-of-brisbane'],
  // Airport link
  ['hendra', 'brisbane-airport'],
  ['pinkenba', 'brisbane-airport'],
  ['nundah', 'brisbane-airport']
];

MANUAL_CONNECTIONS.forEach(([a, b]) => {
  if (adjacency[a] && adjacency[b]) {
    adjacency[a].add(b);
    adjacency[b].add(a);
  }
});

// Graph connectivity check from brisbane-city
function getDistances(startId) {
  const dist = new Map();
  dist.set(startId, 0);
  const q = [startId];
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

let distFromCbd = getDistances('brisbane-city');
const unreached = rawSuburbs.filter(s => !distFromCbd.has(s.id));
if (unreached.length > 0) {
  console.log(`Resolving ${unreached.length} disconnected suburbs...`);
  // Bridge disconnected suburbs to their physically closest connected neighbor
  unreached.forEach(u => {
    let bestNeighbour = null;
    let minD = Infinity;
    rawSuburbs.forEach(cand => {
      if (cand.id !== u.id && distFromCbd.has(cand.id)) {
        const d = haversineKm(u.cLat, u.cLng, cand.cLat, cand.cLng);
        if (d < minD) {
          minD = d;
          bestNeighbour = cand;
        }
      }
    });
    if (bestNeighbour) {
      adjacency[u.id].add(bestNeighbour.id);
      adjacency[bestNeighbour.id].add(u.id);
      distFromCbd = getDistances('brisbane-city');
    }
  });
}

const finalUnreached = rawSuburbs.filter(s => !getDistances('brisbane-city').has(s.id));
console.log(`Final disconnected suburbs: ${finalUnreached.length}`);
if (finalUnreached.length > 0) {
  console.error('ERROR: Graph not fully connected!');
  process.exit(1);
}
console.log('✅ Graph is 100% connected across all Greater Brisbane suburbs!');

// Helper for shortest path
function findShortestPath(start, target) {
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

// Generate Canonical Daily Challenges (2025-2030)
console.log('=== STEP 2: GENERATING CANONICAL DAILY CHALLENGES (2025-2030) ===');

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

function getSeededRandom(seedStr) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

const canonicalChallenges = {};
const allIds = rawSuburbs.map(s => s.id);
const startDate = new Date('2025-01-01T00:00:00Z');
const endDate = new Date('2030-12-31T00:00:00Z');

let solvedCount = 0;
let totalDays = 0;

for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
  totalDays++;
  const dateStr = d.toISOString().split('T')[0];
  const rng = getSeededRandom(`brisbane-${dateStr}`);
  
  let found = false;
  for (let attempt = 0; attempt < 500; attempt++) {
    const sIdx = Math.floor(rng() * allIds.length);
    const startId = allIds[sIdx];
    const distMap = getDistances(startId);
    
    const validTargets = [];
    allIds.forEach(tId => {
      if (tId !== startId && distMap.get(tId) === 5) {
        validTargets.push(tId);
      }
    });

    if (validTargets.length > 0) {
      validTargets.sort();
      const tIdx = Math.floor(rng() * validTargets.length);
      const targetId = validTargets[tIdx];
      const p = findShortestPath(startId, targetId);
      if (p.length === 6) { // Exactly 5 steps
        canonicalChallenges[dateStr] = [startId, targetId];
        found = true;
        solvedCount++;
        break;
      }
    }
  }

  if (!found) {
    const fallbackStart = 'brisbane-city';
    const distMap = getDistances(fallbackStart);
    const valid = allIds.filter(id => distMap.get(id) === 5).sort();
    canonicalChallenges[dateStr] = [fallbackStart, valid[0]];
    solvedCount++;
  }
}

console.log(`Generated ${solvedCount} / ${totalDays} canonical daily challenges for Brisbane. 100% verified 5 steps!`);

// Waterways & Coastlines for Brisbane
const MORETON_BAY_SHORELINE = [
  [153.050, -27.100], // Donnybrook / Pumicestone Passage
  [153.065, -27.140], // Beachmere
  [153.030, -27.185], // Deception Bay
  [153.110, -27.200], // Scarborough / Queens Beach
  [153.115, -27.230], // Redcliffe / Suttons Beach
  [153.110, -27.265], // Woody Point / Clontarf
  [153.075, -27.280], // Bramble Bay
  [153.070, -27.320], // Shorncliffe / Sandgate
  [153.090, -27.345], // Nudgee Beach / Boondall Wetlands
  [153.160, -27.375], // Port of Brisbane / Fisherman Islands
  [153.175, -27.420], // Wynnum North
  [153.185, -27.445], // Wynnum
  [153.195, -27.460], // Manly Marina
  [153.210, -27.475], // Lota
  [153.245, -27.470], // Wellington Point
  [153.265, -27.510], // Ormiston / Raby Bay
  [153.285, -27.530], // Cleveland Point
  [153.295, -27.585], // Victoria Point
  [153.305, -27.650]  // Redland Bay
];

const BRISBANE_RIVER_GIS = [
  [152.800, -27.525], // Colleges Crossing / Mount Crosby
  [152.845, -27.550], // Karalee
  [152.875, -27.585], // Moggill / Riverview
  [152.910, -27.555], // Bellbowrie / Riverhills
  [152.935, -27.535], // Jindalee / Kenmore (Centenary Bridge)
  [152.965, -27.530], // Fig Tree Pocket / Sherwood
  [152.980, -27.505], // Indooroopilly / Chelmer (Walter Taylor Bridge)
  [153.010, -27.500], // St Lucia / Dutton Park (UQ Eleanor Schonell Bridge)
  [153.000, -27.480], // West End / Toowong Reach
  [153.010, -27.470], // Milton / South Brisbane (William Jolly Bridge)
  [153.022, -27.472], // Brisbane City / South Bank (Victoria Bridge)
  [153.032, -27.477], // Captain Cook Bridge (Pacific Mwy)
  [153.035, -27.464], // Fortitude Valley / Kangaroo Point (Story Bridge)
  [153.050, -27.460], // New Farm / Hawthorne
  [153.060, -27.440], // Teneriffe / Bulimba
  [153.090, -27.442], // Eagle Farm / Murarrie (Sir Leo Hielscher Gateway Bridges)
  [153.130, -27.420], // Pinkenba / Hemmant
  [153.170, -27.380]  // Port of Brisbane / River mouth into Moreton Bay
];

const PINE_RIVER_GIS = [
  [152.880, -27.270], // Kurwongbah / Lake Samsonvale
  [152.940, -27.280], // Petrie / North Pine River
  [152.980, -27.275], // Lawnton / Strathpine
  [153.020, -27.260], // Murrumba Downs / Griffin
  [153.045, -27.270], // Bald Hills / Deep Water Bend
  [153.070, -27.265]  // Bramble Bay / Houghton Hwy Bridge (Brighton / Clontarf)
];

console.log('=== STEP 3: WRITING DATA FILES ===');

// File 1: src/data/brisbaneSuburbs.ts
const processedSuburbs = rawSuburbs.map(s => {
  const area = Math.round(polygonAreaKm2(s.ring) * 100) / 100;
  const pop = Math.round(area * 1650);
  const fact = HISTORICAL_FACTS[s.id] || undefined;
  return {
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    postcode: s.postcode,
    region: s.region,
    population: Math.max(800, pop),
    areaKm2: area,
    historicalFact: fact
  };
});

let brisbaneSuburbsCode = `import { SuburbData } from '../types';\n\n`;
brisbaneSuburbsCode += `export const MORETON_BAY_SHORELINE: [number, number][] = ${JSON.stringify(MORETON_BAY_SHORELINE, null, 2)};\n\n`;
brisbaneSuburbsCode += `export const BRISBANE_RIVER_GIS: [number, number][] = ${JSON.stringify(BRISBANE_RIVER_GIS, null, 2)};\n\n`;
brisbaneSuburbsCode += `export const PINE_RIVER_GIS: [number, number][] = ${JSON.stringify(PINE_RIVER_GIS, null, 2)};\n\n`;
brisbaneSuburbsCode += `export const BRISBANE_SUBURBS: SuburbData[] = ${JSON.stringify(processedSuburbs, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, '../src/data/brisbaneSuburbs.ts'), brisbaneSuburbsCode);
console.log('Wrote src/data/brisbaneSuburbs.ts');

// File 2: src/data/brisbaneGeoData.ts
const boundaries = {};
const centers = {};
const finalAdjacency = {};

rawSuburbs.forEach(s => {
  boundaries[s.id] = s.ring;
  centers[s.id] = [s.lng, s.lat];
  finalAdjacency[s.id] = Array.from(adjacency[s.id]).sort();
});

let geoDataCode = `export const BRISBANE_SUBURB_BOUNDARIES: Record<string, [number, number][]> = ${JSON.stringify(boundaries, null, 2)};\n\n`;
geoDataCode += `export const BRISBANE_SUBURB_CENTERS: Record<string, [number, number]> = ${JSON.stringify(centers, null, 2)};\n\n`;
geoDataCode += `export const BRISBANE_SUBURB_ADJACENCY: Record<string, string[]> = ${JSON.stringify(finalAdjacency, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, '../src/data/brisbaneGeoData.ts'), geoDataCode);
console.log('Wrote src/data/brisbaneGeoData.ts');

// File 3: src/data/canonicalBrisbaneDailyChallenges.ts
let canonicalCode = `export const CANONICAL_BRISBANE_DAILY_CHALLENGES: Record<string, [string, string]> = ${JSON.stringify(canonicalChallenges, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, '../src/data/canonicalBrisbaneDailyChallenges.ts'), canonicalCode);
console.log('Wrote src/data/canonicalBrisbaneDailyChallenges.ts');

console.log('🎉 BRISBANE DATA GENERATION COMPLETE! 🎉');
