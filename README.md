# Suburbia 🗺️

An interactive Australian metropolitan geography traversal puzzle game featuring **Melbourne**, **Sydney**, **Adelaide**, **Perth**, **Brisbane**, **Hobart**, and **Canberra**. Navigate between bordering suburbs across genuine cadastral boundaries to reach the destination suburb!

---

## Features

- **Multi-City Support**: Seamlessly toggle between 7 major Australian capital city maps:
  - **Melbourne** (423 suburbs, Victoria)
  - **Sydney** (497 suburbs, New South Wales)
  - **Adelaide** (401 suburbs, South Australia)
  - **Perth** (352 suburbs, Western Australia)
  - **Brisbane** (306 suburbs, Queensland)
  - **Hobart** (122 suburbs, Tasmania)
  - **Canberra** (116 suburbs, Australian Capital Territory)
- **Daily Challenge Mode**: Every player worldwide receives the exact same start and target suburbs based on today's date!
  - 100% immutable canonical schedule across all days and deployments (2025–2030, 2,191 consecutive days).
  - Shortest path distance is guaranteed to be strictly 5 steps.
  - Compare your path lengths and turn counts against the optimal Dijkstra/BFS shortest route.
  - One-click share to compare routes with friends (Wordle-style visual summary and compact route codes).
  - Daily streaks and statistics stored locally in your browser.
- **Practice Mode**: Endless randomly generated puzzles solvable in 5 steps with 10 max turns.
- **Post-Game Suburb Explorer**: Rich tooltips showing population, area (km²), postal code, and notable historical and cultural facts.
- **100% Client-Side**: No backend required. Runs directly in the browser and can be hosted for free on GitHub Pages!

---

## Metropolitan Datasets

All datasets in Suburbia are compiled from authoritative cadastral and geographic open data sources, processed into high-performance SVG boundary geometry, and validated via automated topological graph solvers.

### 1. Victoria (Melbourne) — 423 Suburbs
- **Cadastral Source**: **Vicmap Admin (State Government of Victoria / DataShare Victoria)**: Official Victorian Cadastre and Localities dataset under Creative Commons Attribution 4.0 International (CC BY 4.0), providing gazetted municipal and suburb boundaries for the Greater Melbourne metropolitan area.
- **Hydrography & Coastline**: High-resolution hydrographic flowlines for the Yarra River (*Birrarung*), Maribyrnong River, and Port Phillip Bay coastal line.
- **Demographics & Heritage**: Australian Bureau of Statistics (ABS) 2021 Census data and local municipal history archives.
- **Key Bridges & Connections**: West Gate Bridge, Bolte Bridge, Princes Bridge, Morell Bridge, and Yarra River crossings connecting inner Melbourne.

### 2. New South Wales (Sydney) — 497 Suburbs
- **Cadastral Source**: **Spatial Services NSW (Department of Customer Service)**: Official NSW Digital Cadastral Database (DCDB) and Geoscape Australia Suburbs & Localities dataset under CC BY 4.0, defining 497 Greater Sydney metropolitan suburbs across all Sydney SA4 regions.
- **Hydrography & Coastline**: Pacific Ocean coastline from Palm Beach down to Cronulla / Bundeena; GIS flowlines for Sydney Harbour & Parramatta River, and the Georges River (*Tucoerah*).
- **Demographics & Heritage**: ABS 2021 Census of Population and Housing, historical records from the Dictionary of Sydney and Royal Australian Historical Society.
- **Key Bridges & Crossings**: Sydney Harbour Bridge, Anzac Bridge, Gladesville Bridge, Ryde Bridge, Tom Uglys Bridge, Captain Cook Bridge, and cross-harbour ferry corridors.

### 3. South Australia (Adelaide) — 401 Suburbs
- **Cadastral Source**: **Land Services SA & Department for Infrastructure and Transport (DIT)**: Official South Australian Cadastre (`Suburbs_GDA2020`) via Data SA under CC BY 4.0, defining all 401 metropolitan Adelaide suburban boundaries and gazetted postcodes.
- **Hydrography & Coastline**: Geographic water network data for the River Torrens (*Karrawirra Parri*), Port River (*Yerta Bulti*), Barker Inlet, and Gulf St Vincent shoreline from North Haven to Sellicks Beach.
- **Demographics & Heritage**: Suburb and Locality geographic classifications and South Australian State Library historical records.
- **Key Bridges & Crossings**: Birkenhead Bridge, Port River Expressway Bridge, and Torrens River pedestrian/road bridges.

### 4. Western Australia (Perth) — 352 Suburbs
- **Cadastral Source**: **Landgate Western Australia & Geoscape Australia**: Official Western Australian Cadastre and Suburb Localities dataset under CC BY 4.0, encompassing 352 Greater Perth metropolitan suburbs across 30 Local Government Areas from Two Rocks to Singleton and the Darling Scarp.
- **Hydrography & Coastline**: Indian Ocean Sunset Coast shoreline from Two Rocks to Rockingham / Secret Harbour; high-resolution GIS flowlines for the Swan River (*Derbarl Yerrigan*) and Canning River (*Djarlgarro Beelier*).
- **Demographics & Heritage**: ABS 2021 Census demographic statistics and Western Australian Museum historical records.
- **Key Bridges & Crossings**: The Causeway (Heirisson Island), Narrows Bridge, Matagarup Bridge, Stirling Bridge, Fremantle Traffic Bridge, Garratt Road Bridge, Mt Henry Bridge, Canning Bridge, and the Wadjemup / Rottnest Island ferry bridge.

### 5. Queensland (Brisbane) — 306 Suburbs
- **Cadastral Source**: **Department of Resources Queensland & Geoscape Australia**: Official Queensland Digital Cadastral Database (DCDB) and Localities dataset under CC BY 4.0, covering 306 Greater Brisbane metropolitan suburbs across the City of Brisbane, Moreton Bay, Redland, Logan, and Ipswich.
- **Hydrography & Coastline**: Moreton Bay (*Quandamooka*) eastern coastline from Pumicestone Passage down to Redland Bay; high-resolution GIS coordinates for the winding Brisbane River (*Maiwar*) and Pine River system.
- **Demographics & Heritage**: ABS 2021 Census demographic metrics and State Library of Queensland historical collections.
- **Key Bridges & Crossings**: Story Bridge, Captain Cook Bridge (Pacific Motorway), Victoria Bridge / Kurilpa Bridge / Goodwill Bridge, William Jolly Bridge, Go Between Bridge, Eleanor Schonell Bridge (UQ Green Bridge), Walter Taylor Bridge, Centenary Bridge, Sir Leo Hielscher Gateway Bridges, Houghton Highway / Ted Smout Memorial Bridge (Redcliffe Peninsula), and the Moggill Ferry.

### 6. Tasmania (Hobart) — 122 Suburbs
- **Cadastral Source**: **LIST (Land Information System Tasmania) & Department of Natural Resources and Environment Tasmania (NRE Tas)**: Official Tasmanian Suburb Localities dataset (GDA2020) under CC BY 4.0, defining 122 Greater Hobart metropolitan suburbs across the City of Hobart, City of Glenorchy, City of Clarence, and Kingborough Council (spanning from New Norfolk and Bridgewater down through the CBD to Kingston, Blackmans Bay, and South Arm).
- **Hydrography & Coastline**: High-resolution hydrography for the River Derwent (*Timtumili Minanya*) estuary, Ralphs Bay, and Storm Bay; and the historic Hobart Rivulet descending from kunanyi / Mount Wellington.
- **Demographics & Heritage**: ABS 2021 Census metrics and Tasmanian Archive and Heritage Office (TAHO) historic records.
- **Key Bridges & Crossings**: Tasman Bridge (Brookers Highway / Tasman Highway connecting Hobart and Bellerive / Rosny), Bowen Bridge (connecting Glenorchy and Risdon Cove), Bridgewater Bridge & Causeway (connecting Bridgewater and Granton), and Derwent River ferry links.

### 7. Australian Capital Territory (Canberra) — 116 Suburbs
- **Cadastral Source**: **ACT Government Environment, Planning and Sustainable Development Directorate (EPSDD) & ACTMAPi**: Official ACT Suburb Boundaries (GDA2020) under CC BY 4.0, encompassing 116 gazetted urban suburbs across Central Canberra (North & South Canberra), Woden Valley, Belconnen, Weston Creek, Tuggeranong, Gungahlin, and Molonglo Valley.
- **Hydrography & Coastline**: High-resolution shorelines for Lake Burley Griffin, the Molonglo River corridor, the Murrumbidgee River corridor, and Ginninderra Creek basin.
- **Demographics & Heritage**: ABS 2021 Census statistics, National Capital Authority (NCA) archives, and ACT Heritage Library historical records.
- **Key Bridges & Crossings**: Commonwealth Avenue Bridge, Kings Avenue Bridge, Scrivener Dam / Lady Denman Drive crossing, and Tharwa Bridge.

---

## Dataset Integrity Verification

All 7 city datasets are continuously audited by an automated topological verification suite (`scripts/verifyAllDatasets.cjs`) checking:
1. **Suburb ID Uniqueness**: No duplicate suburb identifiers within or across datasets.
2. **Boundary Validity**: Non-degenerate polygon coordinates, valid winding, and within metropolitan coordinate bounding boxes.
3. **Adjacency Symmetry**: 100% symmetric edge contacts (`if A touches B, then B touches A`), no self-loops, and zero dangling edge references.
4. **Graph Connectivity**: 100% single-component reachability from the CBD via Breadth-First Search (BFS).
5. **Daily Challenge Solvability**: 100% validation of all 2,191 canonical daily challenges (2025–2030), ensuring every puzzle is solvable in strictly 5 steps.

To execute the test suite across all datasets:

```bash
npx tsx scripts/verifyAllDatasets.cjs
```

---

## Build and Deployment

Complete build, local development, containerization, and static deployment instructions (including GitHub Pages with GitHub Actions, Netlify, Vercel, and Cloudflare Pages) are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build production static bundle (dist/)
npm run build

# Run topological verification test suite
npx tsx scripts/verifyAllDatasets.cjs
```

