# Melbourne Traverse 🗺️

An interactive Melbourne metropolitan geography traversal puzzle game. Navigate between bordering suburbs to reach the target suburb!

## Features

- **Daily Challenge Mode**: Every player worldwide gets the exact same start and target suburbs based on today's date!
  - Compare your path lengths and turn counts against the optimal Dijkstra/BFS shortest route.
  - One-click share to compare routes with friends (Wordle-style visual summary and compact route codes).
  - Daily streaks and statistics stored locally in your browser.
- **Practice Mode**: Endless randomly generated puzzles solvable in 5–8 steps, with an allowance of 9–13 steps before the game ends.
- **Post-Game Suburb Explorer**: Rich tooltips showing population, area (km²), established period, and notable historical facts.
- **100% Client-Side**: No backend required. Runs directly in the browser and can be hosted for free on GitHub Pages!

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
