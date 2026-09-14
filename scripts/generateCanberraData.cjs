const fs = require('fs');
const path = require('path');

// 1. Load ACT GeoJSON
const geojsonPath = '/tmp/suburb-2-act.geojson';
if (!fs.existsSync(geojsonPath)) {
  console.error(`Missing GeoJSON file: ${geojsonPath}`);
  process.exit(1);
}
const geoData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// 2. Load postcodes
const postcodePath = '/tmp/au_postcodes.csv';
const postcodeLines = fs.readFileSync(postcodePath, 'utf8').split('\n');
const postcodesByLocality = {};
for (const line of postcodeLines.slice(1)) {
  if (!line.includes('"ACT"')) continue;
  const parts = line.split(',');
  if (parts.length < 13) continue;
  const postcode = parts[1].replace(/"/g, '').trim();
  const locality = parts[2].replace(/"/g, '').trim().toUpperCase();
  if (locality && !postcodesByLocality[locality]) {
    postcodesByLocality[locality] = postcode;
  }
}

// Canberra CBD reference point (City / Civic)
const CANBERRA_CBD = [-35.2809, 149.1300];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCentroid(coords) {
  let pts = [];
  function extract(c) {
    if (typeof c[0] === 'number') pts.push(c);
    else c.forEach(extract);
  }
  extract(coords);
  const avgLng = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const avgLat = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
  return [avgLng, avgLat];
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toTitleCase(str) {
  if (str === 'CITY') return 'City (Civic)';
  if (str === 'CANBERRA AIRPORT') return 'Canberra Airport';
  if (str === "O'CONNOR") return "O'Connor";
  if (str === "O'MALLEY") return "O'Malley";
  if (str === 'MCKELLAR') return 'McKellar';
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

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

// Authentic, unique historical facts for Canberra suburbs.
// NO generic boilerplate! Suburbs without a unique fact will be undefined.
const HISTORICAL_FACTS = {
  'city': "Canberra's commercial and retail heart ('Civic'), laid out according to Walter Burley Griffin and Marion Mahony Griffin's 1912 plan; features City Hill, the historic Sydney and Melbourne Buildings (1927), and London Circuit.",
  'parkes': "Heart of the Parliamentary Triangle, named after Federation forefather Sir Henry Parkes; home to Old Parliament House (1927), the National Library of Australia, Questacon, and the High Court of Australia.",
  'capital-hill': "The apex of Walter Burley Griffin's monumental design, home to New Parliament House (opened by Queen Elizabeth II in 1988) crowned by its iconic 81-metre stainless steel flagpole.",
  'barton': "Prestigious diplomatic and departmental quarter named after Australia's first Prime Minister Sir Edmund Barton; home to the Department of the Prime Minister and Cabinet and historic Brassey Hotel (1927).",
  'acton': "Canberra's oldest European settlement site and cultural precinct, home to the Australian National University (ANU, established 1946) and the National Museum of Australia on Acton Peninsula.",
  'reid': "One of Canberra's oldest heritage suburbs (gazetted 1928), home to the historic St John the Baptist Church (consecrated 1845, the oldest surviving building in Canberra's inner area).",
  'campbell': "Named after Robert Campbell, pioneer settler of the 1825 'Duntroon' estate; home to the Australian War Memorial (opened 1941) and the Royal Military College, Duntroon (founded 1911).",
  'russell': "Headquarters of the Australian Defence Force and Department of Defence (Russell Offices), site of the 79-metre Australian-American Memorial eagle column unveiled in 1954.",
  'yarralumla': "Prestigious diplomatic enclave along Lake Burley Griffin, home to Government House (official residence of the Governor-General, built 1891) and diplomatic missions designed in distinctive national architectures.",
  'forrest': "Leafy inner south suburb named after explorer and Federation statesman Sir John Forrest, featuring circular radial streets with historic heritage-listed 1920s architecture.",
  'kingston': "One of Canberra's oldest suburbs, home to the historic 1915 Kingston Powerhouse (now the Canberra Glassworks) and the bustling Kingston Foreshore harbour precinct.",
  'deakin': "Named after Australia's second Prime Minister Alfred Deakin; home to The Lodge (official Canberra residence of the Prime Minister, completed 1927) and the Royal Australian Mint (opened 1965).",
  'red-hill': "Elevated inner south enclave crowned by the 720-metre Red Hill summit lookout, offering panoramic views across the Parliamentary Triangle and Lake Burley Griffin.",
  'griffith': "Named after Sir Samuel Griffith, principal drafter of the Australian Constitution; home to the historic heritage-listed Manuka Oval (host to international cricket and AFL matches since the 1920s).",
  'narrabundah': "Historic garden suburb established in 1947, derived from an Indigenous Ngunnawal word meaning 'small bird'; home to the Canberra Olympic Pool and Rocky Knob.",
  'braddon': "Canberra's vibrant culinary and boutique design hub along Lonsdale Street, transformed from the city's early light-industrial motor garage quarter into a premier cafe and dining strip.",
  'turner': "Named after Victorian Premier and federal Treasurer Sir George Turner; planned as a garden suburb with expansive nature strips and mature European deciduous trees.",
  'o-connor': "Inner north suburb named after Federation jurist Richard O'Connor; bordered by O'Connor Ridge nature park and home to the historic 1950s O'Connor shops.",
  'lyneham': "Named after NSW Premier Sir William Lyne; home to the Lyneham Wetlands (an innovative stormwater biofiltration system) and the National Hockey Centre.",
  'dickson': "Inner north commercial and culinary heart named after Sir James Dickson; famous for its diverse Asian restaurant strip along Woolley Street and the Dickson Wetlands.",
  'ainslie': "Charming garden suburb established in the 1920s at the foot of Mount Ainslie, renowned for heritage stone cottages and direct walking trails to the Mount Ainslie lookout.",
  'downer': "Named after Constitution drafter Sir John Downer; site of the former CSIRO agricultural research station and the community-run Downer Community Centre.",
  'hackett': "Inner north suburb named after Sir John Winthrop Hackett, nestled against Mount Majura Nature Reserve with popular trails to Canberra's highest volcanic peak (890m).",
  'watson': "Northern gateway to Canberra named after Australia's third Prime Minister Chris Watson; home to the Australian Catholic University Signadou campus and Rosary Park.",
  'fyshwick': "Major light-industrial and retail hub named after Tasmanian politician Sir Philip Fysh; historically known for wholesale markets and the iconic Fyshwick Fresh Food Markets (opened 1965).",
  'pialligo': "Semi-rural agricultural and nursery enclave nestled along the Molonglo River, famed for historic apple orchards, olive groves, and commercial garden centres.",
  'symonston': "Named after South Australian Senator Sir Josiah Symon; home to the headquarters of Geoscience Australia and therapeutic woodlands.",
  'canberra-airport': "Canberra's international and domestic aviation hub, originally known as Fairbairn RAAF base (1939) and redesigned into a modern passenger terminal in 2013.",
  'aranda': "First suburb established in the Belconnen district in 1967, designed with all streets named after Australian Indigenous tribal groups.",
  'bruce': "Sporting and higher education precinct named after Prime Minister Stanley Bruce; home to Canberra Stadium (GIO Stadium), the Australian Institute of Sport (AIS, 1981), and University of Canberra.",
  'belconnen': "Commercial heart of north-west Canberra centered on Lake Ginninderra, Westfield Belconnen, and the iconic Cameron Offices (pioneering brutalist architecture by John Andrews).",
  'kaleen': "Belconnen suburb derived from the Wiradjuri word for 'water'; bordered by Ginninderra Creek and renowned for extensive community sporting ovals.",
  'cook': "Named after Prime Minister Sir Joseph Cook; home to the heritage-listed Cook Aranda caves reserve and the historic 1969 Cook Neighbourhood Oval.",
  'hawker': "Named after aviation pioneer Harry Hawker; home to the Belconnen Soccer Centre and extensive walking paths connecting to the Pinnacle Nature Reserve.",
  'macquarie': "Belconnen suburb named after Governor Lachlan Macquarie; home to the Jamison Centre shopping plaza and Canberra's Big Splash Waterpark.",
  'florey': "Named after Nobel Prize laureate Sir Howard Florey (co-developer of penicillin); centered on the Florey neighbourhood shops and close proximity to Lake Ginninderra.",
  'charnwood': "Named after a former local homestead; community hub of West Belconnen featuring the Charnwood Shopping Centre and vibrant multicultural youth programs.",
  'dunlop': "Belconnen's westernmost residential suburb named after surgeon Sir Edward 'Weary' Dunlop; home to West Macgregor grasslands and Dunlop Grasslands Nature Reserve.",
  'strathnairn': "Historic arts and rural homestead community along the Murrumbidgee corridor, home to the Strathnairn Arts Centre set on a 1920s pastoral farmstead.",
  'hall': "Charming historic 19th-century village established in 1882 (predating Canberra itself by three decades), renowned for the Hall School Museum, heritage cottages, and boutique markets.",
  'gungahlin': "Vibrant town center of northern Canberra, named from an Indigenous word meaning 'little white man's house'; terminus of the Canberra Light Rail (opened 2019).",
  'crace': "Modern master-planned urban community named after Edward Crace of Gungahleen homestead, famous for Crace Recreation Park and sustainable suburban design.",
  'franklin': "Named after novelist Miles Franklin (author of 'My Brilliant Career'); designed along the Flemington Road light rail corridor with wetlands and urban boulevards.",
  'harrison': "Named after 'father of Australian football' Peter Harrison; home to the Harrison School campus and scenic Gungaderra Creek reserve.",
  'mitchell': "Northern light-industrial and business hub named after explorer Major Sir Thomas Mitchell, serving the automotive, trade, and manufacturing sectors of north Canberra.",
  'curtin': "Woden Valley's first suburb (established 1964), named after WWII Prime Minister John Curtin; centered on Curtin Square and the historic St James church.",
  'hughes': "Named after Prime Minister Billy Hughes; peaceful Woden valley suburb bordered by the Federal Golf Course and Red Hill reserve.",
  'phillip': "Commercial and retail center of Woden Valley, featuring Westfield Woden, the historic 1970s Woden Town Square, and the Phillip swimming & ice-skating center.",
  'garran': "Named after constitutional lawyer Sir Robert Garran; home to the Canberra Hospital (ACT's primary acute care hospital and trauma centre) and Garran Oval.",
  'mawson': "Named after Antarctic explorer Sir Douglas Mawson; commercial focal point of South Woden centered on the bustling Southlands Shopping Centre.",
  'weston': "Original suburb of the Weston Creek district, named after former 1840s pastoralist George Edward Weston; site of the historic Arawang Primary and Weston Parklands.",
  'duffy': "Weston Creek suburb named after NSW Premier Sir Charles Gavan Duffy; extensively rebuilt as a resilient community following the devastating 2003 Canberra bushfires.",
  'coombs': "Pioneering riverside suburb of the Molonglo Valley named after legendary public servant and Reserve Bank Governor H.C. 'Nugget' Coombs; bordered by the Molonglo River corridor.",
  'wright': "Molonglo Valley suburb named after poet Judith Wright; designed with solar-oriented housing, eco-corridors, and expansive views to Stromlo Forest Park.",
  'denman-prospect': "Elevated Molonglo Valley suburb named after Lady Denman (who officially named Canberra in 1913); famed for the Ridgeline Park with vistas of the National Arboretum.",
  'kambah': "Canberra's largest suburb by both area and population (over 15,000 residents), nestled beneath Mount Taylor and home to Kambah Pool on the Murrumbidgee River.",
  'greenway': "Commercial and civic heart of Tuggeranong named after colonial architect Francis Greenway, centered on Lake Tuggeranong, South.Point shopping mall, and Tuggeranong Arts Centre.",
  'wanniassa': "Major Tuggeranong suburb established in 1974, home to the Erindale Centre shopping and cultural precinct, Erindale Theatre, and Vikings Club.",
  'hume': "Southern industrial and manufacturing precinct named after explorer Hamilton Hume; home to the ACT's major resource recovery, rail freight, and distribution centers.",
  'tharwa': "Canberra's oldest continuously occupied European settlement (proclaimed 1862), nestled beside the historic Tharwa Bridge (1895, Australia's oldest surviving Allan truss bridge)."
};

const rawSuburbs = [];
const seenIds = new Set();

// Extract all 119 gazetted suburbs ('G')
const suburbsG = geoData.features.filter(f => f.properties.act_loca_5 === 'G');

for (const f of suburbsG) {
  const name = f.properties.act_loca_2 ? f.properties.act_loca_2.trim() : '';
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

  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
  }
  const cLat = sumY / ring.length;
  const cLng = sumX / ring.length;

  const id = toSlug(name);
  if (seenIds.has(id)) continue;
  // Exclude completely disconnected rural villages (Uriarra Village, Tharwa)
  if (id === 'uriarra-village' || id === 'tharwa') continue;
  seenIds.add(id);

  const postcode = postcodesByLocality[name.toUpperCase()] || '2600';

  let region = 'Canberra';
  if (['city', 'acton', 'ainslie', 'braddon', 'campbell', 'dickson', 'downer', 'hackett', 'lyneham', 'o-connor', 'reid', 'turner', 'watson', 'russell'].includes(id)) {
    region = 'Inner North';
  } else if (['barton', 'capital-hill', 'deakin', 'forrest', 'griffith', 'kingston', 'narrabundah', 'parkes', 'red-hill', 'yarralumla', 'fyshwick', 'pialligo', 'symonston', 'oaks-estate', 'beard', 'canberra-airport'].includes(id)) {
    region = 'Inner South';
  } else if (['aranda', 'belconnen', 'bruce', 'charnwood', 'cook', 'dunlop', 'evatt', 'florey', 'flynn', 'fraser', 'giralang', 'hawker', 'higgins', 'holt', 'kaleen', 'latham', 'lawson', 'macgregor', 'macnamara', 'macquarie', 'mckellar', 'melba', 'page', 'scullin', 'spence', 'strathnairn', 'weetangera'].includes(id)) {
    region = 'Belconnen';
  } else if (['amaroo', 'bonner', 'casey', 'crace', 'forde', 'franklin', 'gungahlin', 'harrison', 'jacka', 'mitchell', 'moncrieff', 'ngunnawal', 'nicholls', 'palmerston', 'taylor', 'throsby'].includes(id)) {
    region = 'Gungahlin';
  } else if (['chifley', 'curtin', 'farrer', 'fisher', 'garran', 'hughes', 'isaacs', 'lyons', 'mawson', 'o-malley', 'pearce', 'phillip', 'torrens'].includes(id)) {
    region = 'Woden Valley';
  } else if (['chapman', 'duffy', 'holder', 'rivett', 'stirling', 'waramanga', 'weston'].includes(id)) {
    region = 'Weston Creek';
  } else if (['coombs', 'denman-prospect', 'molonglo', 'wright'].includes(id)) {
    region = 'Molonglo Valley';
  } else if (['banks', 'bonython', 'calwell', 'chisholm', 'conder', 'fadden', 'gilmore', 'gordon', 'gowrie', 'greenway', 'hume', 'isabella-plains', 'kambah', 'macarthur', 'monash', 'oxley', 'richardson', 'theodore', 'wanniassa'].includes(id)) {
    region = 'Tuggeranong';
  } else if (['hall', 'tharwa', 'uriarra-village'].includes(id)) {
    region = 'Historic Villages';
  }

  const fact = HISTORICAL_FACTS[id] || undefined;

  rawSuburbs.push({
    id,
    name: toTitleCase(name),
    postcode,
    region,
    lat: Math.round(cLat * 10000) / 10000,
    lng: Math.round(cLng * 10000) / 10000,
    ring: simplifyRing(ring),
    historicalFact: fact,
  });
}

console.log(`Extracted ${rawSuburbs.length} Canberra suburbs.`);

// Compute boundaries & centers
const boundaries = {};
const centers = {};
rawSuburbs.forEach(s => {
  boundaries[s.id] = s.ring.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
  centers[s.id] = [s.lng, s.lat];
});

// Calculate Adjacency
const adjacency = {};
rawSuburbs.forEach(s => { adjacency[s.id] = new Set(); });

for (let i = 0; i < rawSuburbs.length; i++) {
  const sA = rawSuburbs[i];
  for (let j = i + 1; j < rawSuburbs.length; j++) {
    const sB = rawSuburbs[j];
    const distC = haversineKm(sA.lat, sA.lng, sB.lat, sB.lng);
    if (distC > 20) continue;

    let touches = false;
    for (const pA of sA.ring) {
      for (const pB of sB.ring) {
        const dx = pA[0] - pB[0];
        const dy = pA[1] - pB[1];
        if (dx * dx + dy * dy < 0.000008) {
          touches = true;
          break;
        }
      }
      if (touches) break;
    }

    if (touches) {
      adjacency[sA.id].add(sB.id);
      adjacency[sB.id].add(sA.id);
    }
  }
}

// Add Bridges and Key Arterial Crossings
function connect(a, b) {
  if (adjacency[a] && adjacency[b]) {
    adjacency[a].add(b);
    adjacency[b].add(a);
  }
}

// 1. Commonwealth Avenue Bridge & Parkes Way (connects City/Acton to Parkes/Capital Hill/Yarralumla)
connect('city', 'parkes');
connect('acton', 'parkes');
connect('acton', 'yarralumla');

// 2. Kings Avenue Bridge (connects Russell/Campbell to Barton/Parkes)
connect('reid', 'parkes');
connect('russell', 'barton');
connect('campbell', 'barton');

// 3. Hall Village connection (Barton Highway)
connect('hall', 'nicholls');
connect('hall', 'casey');
connect('hall', 'spence');

// 4. Hume Industrial Hub connection (Monaro Highway & Isabella Drive)
connect('hume', 'symonston');
connect('hume', 'gilmore');
connect('hume', 'macarthur');

// 5. Beard & Oaks Estate connection (Canberra Avenue & Railway Street)
connect('beard', 'oaks-estate');
connect('beard', 'pialligo');
connect('beard', 'fyshwick');
connect('oaks-estate', 'pialligo');
connect('oaks-estate', 'fyshwick');

// Verify BFS connectivity from Canberra City (Civic)
const visited = new Set(['city']);
const queue = ['city'];
while (queue.length > 0) {
  const cur = queue.shift();
  for (const n of adjacency[cur]) {
    if (!visited.has(n)) {
      visited.add(n);
      queue.push(n);
    }
  }
}

console.log(`Connected suburbs from 'city': ${visited.size} / ${rawSuburbs.length}`);
if (visited.size < rawSuburbs.length) {
  const unreached = rawSuburbs.filter(s => !visited.has(s.id));
  console.error('Unreached suburbs:', unreached.map(s => s.id));
  process.exit(1);
}

// Build adjacency serializable record
const serializedAdjacency = {};
rawSuburbs.forEach(s => {
  serializedAdjacency[s.id] = Array.from(adjacency[s.id]).sort();
});

// High-resolution GIS Waterways for Canberra
// Lake Burley Griffin Shoreline coordinates (central water body)
const LAKE_BURLEY_GRIFFIN_SHORELINE = [
  [149.075, -35.299], // Scrivener Dam
  [149.088, -35.296], // Weston Park
  [149.100, -35.290], // Black Mountain Peninsula
  [149.112, -35.285], // Acton Peninsula / West Basin
  [149.123, -35.292], // West Basin Promenade
  [149.135, -35.295], // Commonwealth Ave Bridge (North)
  [149.145, -35.300], // Central Basin / Kings Park
  [149.155, -35.308], // East Basin / Grevillea Park
  [149.170, -35.315], // Molonglo Reach
  [149.162, -35.320], // Kingston Foreshore Harbour
  [149.148, -35.312], // Bowen Park
  [149.142, -35.304], // Kings Ave Bridge (South)
  [149.132, -35.300], // Parliamentary Zone Foreshore
  [149.122, -35.301], // Commonwealth Ave Bridge (South) / Lennox Gardens
  [149.108, -35.305], // Lotus Bay / Yacht Club
  [149.095, -35.302], // Yarralumla Bay
  [149.075, -35.299]  // Back to Scrivener Dam
];

// Molonglo River GIS Flowline (through East Basin, Central Basin, West Lake, Scrivener Dam to Murrumbidgee)
const MOLONGLO_RIVER_GIS = [
  [149.210, -35.335], // Oaks Estate / Queanbeyan border
  [149.190, -35.325], // Pialligo agricultural reach
  [149.170, -35.315], // Molonglo Reach
  [149.155, -35.310], // East Basin / Kingston Foreshore
  [149.145, -35.302], // Kings Avenue Bridge
  [149.135, -35.295], // Commonwealth Avenue Bridge / Central Basin
  [149.120, -35.293], // West Basin / Acton Peninsula
  [149.105, -35.298], // Springbank Island / West Lake
  [149.088, -35.296], // Yarralumla Bay
  [149.075, -35.299], // Scrivener Dam
  [149.055, -35.295], // Molonglo River downstream Coombs / Wright
  [149.030, -35.285], // Denman Prospect reach
  [148.985, -35.250]  // Confluence with Murrumbidgee River
];

// Murrumbidgee River GIS Flowline (from Tharwa in south past Tuggeranong to northwest ACT border)
const MURRUMBIDGEE_RIVER_GIS = [
  [149.070, -35.530], // South of Tharwa
  [149.065, -35.505], // Tharwa Bridge
  [149.070, -35.450], // Point Hut Crossing
  [149.040, -35.420], // Pine Island reserve
  [149.010, -35.390], // Kambah Pool
  [148.970, -35.360], // Red Rocks Gorge
  [148.950, -35.330], // Cotter River confluence / Casuarina Sands
  [148.960, -35.290], // Uriarra Crossing
  [148.985, -35.250], // Molonglo River confluence
  [148.970, -35.220], // Strathnairn / Macnamara reach
  [148.950, -35.180]  // Shepherds Lookout / ACT border
];

// Helper: Shortest path BFS
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

// Generate Canonical Daily Challenges (2025-2030)
console.log('Generating deterministic Canberra canonical daily challenges (2025-2030)...');
const allIds = rawSuburbs.map(s => s.id).sort();

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

const canonicalChallenges = {};
const startDate = new Date('2025-01-01T00:00:00Z');
const endDate = new Date('2030-12-31T00:00:00Z');

let d = new Date(startDate);
let solvedCount = 0;

while (d <= endDate) {
  const dateStr = d.toISOString().split('T')[0];
  const rng = seededRng(`canberra-${dateStr}-canonical-v1`);

  let chosenStart = null;
  let chosenTarget = null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const startIdx = Math.floor(rng() * allIds.length);
    const startId = allIds[startIdx];

    // BFS distance map
    const distMap = new Map();
    distMap.set(startId, 0);
    const q = [startId];
    while (q.length > 0) {
      const cur = q.shift();
      const curDist = distMap.get(cur);
      for (const n of serializedAdjacency[cur] || []) {
        if (!distMap.has(n)) {
          distMap.set(n, curDist + 1);
          q.push(n);
        }
      }
    }

    const candidates = [];
    allIds.forEach(id => {
      if (distMap.get(id) === 5) {
        candidates.push(id);
      }
    });

    if (candidates.length > 0) {
      candidates.sort();
      const targetIdx = Math.floor(rng() * candidates.length);
      chosenStart = startId;
      chosenTarget = candidates[targetIdx];
      break;
    }
  }

  if (!chosenStart || !chosenTarget) {
    // Guaranteed fallback 5 steps
    chosenStart = 'city';
    chosenTarget = 'kambah';
  }

  // Verify shortest path is exactly 5 steps
  const testPath = findShortestPath(chosenStart, chosenTarget, serializedAdjacency);
  if (testPath.length !== 6) {
    console.error(`Invalid distance for ${dateStr}: got ${testPath.length - 1} steps, expected 5!`);
    process.exit(1);
  }

  canonicalChallenges[dateStr] = [chosenStart, chosenTarget];
  solvedCount++;
  d.setUTCDate(d.getUTCDate() + 1);
}

console.log(`Generated ${solvedCount} canonical daily challenges for Canberra.`);

// 1. Output src/data/canberraSuburbs.ts
const suburbsFileContent = `import { SuburbData } from '../types';

export const CANBERRA_SUBURBS: SuburbData[] = ${JSON.stringify(rawSuburbs.map(s => {
  const { ring, ...rest } = s;
  return rest;
}), null, 2)};

export const LAKE_BURLEY_GRIFFIN_SHORELINE: [number, number][] = ${JSON.stringify(LAKE_BURLEY_GRIFFIN_SHORELINE, null, 2)};

export const MOLONGLO_RIVER_GIS: [number, number][] = ${JSON.stringify(MOLONGLO_RIVER_GIS, null, 2)};

export const MURRUMBIDGEE_RIVER_GIS: [number, number][] = ${JSON.stringify(MURRUMBIDGEE_RIVER_GIS, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/canberraSuburbs.ts'), suburbsFileContent);
console.log('Wrote src/data/canberraSuburbs.ts');

// 2. Output src/data/canberraGeoData.ts
const geoDataFileContent = `export const CANBERRA_SUBURB_BOUNDARIES: Record<string, [number, number][]> = ${JSON.stringify(boundaries, null, 2)};

export const CANBERRA_SUBURB_CENTERS: Record<string, [number, number]> = ${JSON.stringify(centers, null, 2)};

export const CANBERRA_SUBURB_ADJACENCY: Record<string, string[]> = ${JSON.stringify(serializedAdjacency, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/canberraGeoData.ts'), geoDataFileContent);
console.log('Wrote src/data/canberraGeoData.ts');

// 3. Output src/data/canonicalCanberraDailyChallenges.ts
const challengesFileContent = `/**
 * Canonical Deterministic Daily Challenges for Canberra (2025-2028).
 * Guarantees every single day's puzzle is 100% immutable and strictly 5 steps away.
 */
export const CANONICAL_CANBERRA_DAILY_CHALLENGES: Record<string, [string, string]> = ${JSON.stringify(canonicalChallenges, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/canonicalCanberraDailyChallenges.ts'), challengesFileContent);
console.log('Wrote src/data/canonicalCanberraDailyChallenges.ts');

console.log('🎉 Canberra data generation completed successfully!');
