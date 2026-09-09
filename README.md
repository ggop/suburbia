# Suburbia 🗺️

An interactive Australian metropolitan geography traversal puzzle game featuring Melbourne and Adelaide. Navigate between bordering suburbs to reach the target suburb!

## Features

- **Multi-City Support**: Seamlessly toggle between **Melbourne** (423 suburbs) and **Adelaide** (401 suburbs).
- **Daily Challenge Mode**: Every player worldwide gets the exact same start and target suburbs based on today's date!
  - Compare your path lengths and turn counts against the optimal Dijkstra/BFS shortest route.
  - One-click share to compare routes with friends (Wordle-style visual summary and compact route codes).
  - Daily streaks and statistics stored locally in your browser.
- **Practice Mode**: Endless randomly generated puzzles solvable in 5–8 steps, with an allowance of 9–13 steps before the game ends.
- **Post-Game Suburb Explorer**: Rich tooltips showing population, area (km²), established period, and notable historical facts.
- **100% Client-Side**: No backend required. Runs directly in the browser and can be hosted for free on GitHub Pages!

## Data Sources

The geographic boundaries, cadastral data, and cartographic overlays in Suburbia are compiled from the following open and authoritative geospatial data sources:

### 1. Victoria (Melbourne)
- **Vicmap Admin (State Government of Victoria / DataShare Victoria)**: Official Victorian Cadastre and Localities dataset under Creative Commons Attribution 4.0 International (CC BY 4.0), providing gazetted municipal and suburb boundaries for the Greater Melbourne metropolitan area.
- **Vicmap Hydro / Department of Energy, Environment and Climate Action (DEECA)**: High-resolution hydrographic flowlines for the Yarra River, Maribyrnong River, and Port Phillip Bay coastal line.
- **Australian Bureau of Statistics (ABS)**: Australian Statistical Geography Standard (ASGS) Edition 3 – Suburbs and Localities (SAL) and 2021 Census of Population and Housing for demographic and area statistics.

### 2. South Australia (Adelaide)
- **Land Services SA & Department for Infrastructure and Transport (DIT) (Government of South Australia)**: Official South Australian Cadastre (`Suburbs_GDA2020`) via Data SA ([data.sa.gov.au](https://data.sa.gov.au/)) under Creative Commons Attribution 4.0 International (CC BY 4.0), defining all 401 metropolitan Adelaide suburban boundaries and gazetted postcodes.
- **Department for Environment and Water (DEW) / SA Water**: Geographic water network data for the River Torrens (*Karrawirra Parri*), Port River (*Yerta Bulti*), Barker Inlet, and Gulf St Vincent shoreline.
- **Australian Bureau of Statistics (ABS)**: Suburb and Locality geographic classification and demographic estimates.

### 3. Spatial Processing & Topology
- **Turf.js**: Open-source spatial analysis engine used to compute topological shared-border adjacency (`booleanTouches`, `booleanIntersects`), polygon simplification, and interior visual centerpoints (`pointOnFeature`).

## Hosting on GitHub Pages

This project requires **no backend** and outputs static HTML, JS, and CSS files to `dist/`.

### Method 1: Automatic Deployment with GitHub Actions (Recommended)

1. Push this repository to GitHub.
2. In your GitHub repository, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow will automatically build and publish your site!

### Method 2: Manual Static Deployment

```bash
# Install dependencies
npm install

# Build the production static site
npm run build
```

Deploy the contents of the `dist/` directory to any static web host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, AWS S3, etc.).

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
