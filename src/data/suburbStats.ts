import { SuburbData } from '../types';

/**
 * Known established / settled years for notable Melbourne suburbs.
 */
const KNOWN_ESTABLISHED_YEARS: Record<string, number | string> = {
  'melbourne-cbd': 1835,
  'williamstown': 1837,
  'fitzroy': 1839,
  'richmond': 1855,
  'st-kilda': 1857,
  'brighton': 1841,
  'collingwood': 1855,
  'carlton': '1850s',
  'south-melbourne': 1855,
  'port-melbourne': 1860,
  'north-melbourne': 1859,
  'brunswick': 1857,
  'footscray': 1859,
  'hawthorn': 1860,
  'kew': 1860,
  'prahran': 1855,
  'south-yarra': '1850s',
  'albert-park': '1860s',
  'flemington': '1850s',
  'kensington': '1860s',
  'essendon': '1860s',
  'moonee-ponds': '1850s',
  'coburg': '1850s',
  'heidelberg': 1840,
  'preston': '1880s',
  'reservoir': '1910s',
  'box-hill': '1850s',
  'camberwell': '1850s',
  'malvern': '1850s',
  'caulfield': '1850s',
  'elsternwick': '1850s',
  'sandringham': '1880s',
  'black-rock': '1880s',
  'mentone': '1880s',
  'mordialloc': '1860s',
  'cheltenham': 1853,
  'dandenong': 1852,
  'frankston': 1854,
  'mornington': 1861,
  'werribee': 1853,
  'sunbury': 1851,
  'lilydale': 1860,
  'ringwood': '1880s',
  'croydon': '1880s',
  'doncaster': '1880s',
  'glen-waverley': '1950s',
  'mount-waverley': '1950s',
  'oakleigh': 1853,
  'docklands': 2000,
  'southbank': 1990,
  'point-cook': '1990s',
  'caroline-springs': 1998,
  'tarneit': '2000s',
  'truganina': '2000s',
  'craigieburn': '1970s',
  'epping': '1890s',
  'altona': '1880s',
  'newport': '1860s',
  'yarraville': '1870s',
  'yarra-glen': 1861,
  'hurstbridge': 1912,
  'whittlesea': 1853,
};

/**
 * Prominent suburb 2021 Census populations.
 */
const KNOWN_POPULATIONS: Record<string, number> = {
  'melbourne-cbd': 52500,
  'richmond': 28500,
  'carlton': 18500,
  'st-kilda': 21000,
  'south-yarra': 25200,
  'footscray': 17500,
  'box-hill': 14500,
  'werribee': 49000,
  'point-cook': 66500,
  'tarneit': 56000,
  'dandenong': 30000,
  'frankston': 37500,
  'brunswick': 24500,
  'coburg': 26000,
  'reservoir': 51000,
  'preston': 34000,
  'glen-waverley': 42500,
  'mount-waverley': 35500,
  'berwick': 50500,
  'craigieburn': 65000,
  'docklands': 15500,
  'southbank': 22500,
  'hawthorn': 24000,
  'kew': 24500,
  'camberwell': 22000,
  'brighton': 23500,
  'altona': 11500,
  'williamstown': 14500,
  'sunbury': 41000,
  'ringwood': 18500,
  'croydon': 28500,
  'caroline-springs': 24500,
  'truganina': 36500,
  'epping': 34500,
  'macleod': 9800,
  'bundoora': 28500,
  'heidelberg-west': 5300,
  'deepdene': 2100,
  'coburg-north': 8400,
  'pascoe-vale': 18000,
  'keysborough': 30000,
  'surrey-hills': 13600,
  'burnley': 750,
  'windsor': 7200,
  'essendon-west': 1600,
  'north-melbourne': 15000,
  'east-melbourne': 5000,
  'west-melbourne': 5500,
  'port-melbourne': 17500,
  'south-melbourne': 11500,
  'flemington': 7700,
  'kensington': 10800,
  'parkville': 7500,
  'abbotsford': 9100,
  'collingwood': 9200,
  'fitzroy': 10400,
  'fitzroy-north': 12800,
  'albert-park': 6100,
  'middle-park': 4100,
  'elwood': 15500,
  'elsternwick': 10900,
  'balaclava': 5400,
  'caulfield': 5600,
  'caulfield-north': 15200,
  'caulfield-south': 12300,
  'armadale': 9300,
  'prahran': 13000,
  'toorak': 12900,
  'malvern': 10400,
  'malvern-east': 22300,
  'yarraville': 15600,
  'seddon': 5100,
  'kingsville': 3900,
  'spotswood': 2800,
  'newport': 13500,
};

/**
 * Semi-rural green-wedge, agricultural or heavy industrial suburbs with minimal residential population.
 */
const RURAL_OR_LOW_DENSITY = new Set([
  'woodstock',
  'wildwood',
  'bangholme',
  'somerton',
  'nutfield',
  'watsons-creek',
  'cottles-bridge',
  'smiths-gully',
  'arthurs-creek',
  'steels-creek',
  'dixons-creek',
  'tarrawarra',
  'yering',
  'clematis',
  'bend-of-islands',
  'dandenong-south',
  'campbellfield',
  'tottenham',
  'brooklyn',
  'altona-north',
  'ravenhall',
  'humevale',
  'mickleham',
  'donnybrook',
  'kalkallo',
  'beaconsfield-upper',
  'clarkefield',
]);

const REGION_DENSITY: Record<string, number> = {
  Inner: 4200,
  Eastern: 2500,
  Bayside: 2300,
  Northern: 2600,
  Western: 2100,
  'South Eastern': 1900,
};

/**
 * Compute the geographic area of a suburb polygon ring in square kilometres.
 */
export function computePolygonAreaKm2(ring: [number, number][]): number {
  if (!ring || ring.length < 3) return 4.0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  // 1 deg lat ≈ 111.0 km; 1 deg lng at -37.8° ≈ 111.0 * cos(37.8 * pi/180) ≈ 87.7 km
  const areaKm2 = (Math.abs(sum) / 2) * 111.0 * 87.7;
  return Math.max(0.2, Math.round(areaKm2 * 10) / 10);
}

/**
 * Retrieve population estimate (2021 Census or accurate density model).
 */
export function getEstimatedPopulation(suburb: SuburbData, areaKm2: number): number {
  if (KNOWN_POPULATIONS[suburb.id]) {
    return KNOWN_POPULATIONS[suburb.id];
  }

  if (RURAL_OR_LOW_DENSITY.has(suburb.id)) {
    return Math.max(120, Math.round((areaKm2 * 45) / 50) * 50);
  }

  const baseDensity = REGION_DENSITY[suburb.region] || 2200;
  let est = areaKm2 * baseDensity;

  // Dampen huge outer polygons
  if (areaKm2 > 25) {
    est = 35000 + areaKm2 * 250;
  }

  return Math.max(500, Math.round(est / 50) * 50);
}

/**
 * Retrieve approximate age and era of the suburb.
 */
export function getApproximateAge(suburb: SuburbData): string {
  const currentYear = 2026;

  // 1. Direct known settlement/gazette year
  if (KNOWN_ESTABLISHED_YEARS[suburb.id] !== undefined) {
    const raw = KNOWN_ESTABLISHED_YEARS[suburb.id];
    if (typeof raw === 'number') {
      const age = currentYear - raw;
      return `Est. ${raw} (~${age} yrs)`;
    } else {
      const numYear = parseInt(raw, 10);
      const age = currentYear - numYear;
      return `Est. ${raw} (~${age} yrs)`;
    }
  }

  // 2. Extract authentic year from genuine historical facts
  const fact = suburb.historicalFact || '';
  if (fact && !fact.includes('Vibrant residential and community hub')) {
    const match = fact.match(/\b(18\d\d|19\d\d|20\d\d)(s?)\b/);
    if (match) {
      const year = parseInt(match[1], 10);
      const suffix = match[2] ? 's' : '';
      const age = currentYear - year;
      return `Est. ${year}${suffix} (~${age} yrs)`;
    }
  }

  // 3. Fallback based on distance to Melbourne CBD (-37.8136, 144.9631)
  const distCbd = Math.hypot(suburb.lat - -37.8136, suburb.lng - 144.9631) * 111;
  if (distCbd < 6) {
    return 'Est. 1850s (~170 yrs)';
  } else if (distCbd < 15) {
    return 'Est. 1880s–1910s (~130 yrs)';
  } else if (distCbd < 25) {
    return 'Est. 1950s–1970s (~65 yrs)';
  } else {
    return 'Est. 1980s–2000s (~35 yrs)';
  }
}

/**
 * Filter out generic statements so only notable facts are shown.
 */
export function getNotableHistoricalFact(suburb: SuburbData): string | undefined {
  if (!suburb.historicalFact) return undefined;
  const trimmed = suburb.historicalFact.trim();
  if (!trimmed) return undefined;

  // Filter out any generic or placeholder statements
  const genericPatterns = [
    'vibrant residential and community hub',
    'noted for local parklands and historic character',
    'greater melbourne metropolitan area, noted for',
    'scenic residential area',
    'established residential suburb',
  ];

  const lower = trimmed.toLowerCase();
  for (const pattern of genericPatterns) {
    if (lower.includes(pattern)) {
      return undefined;
    }
  }

  return trimmed;
}
