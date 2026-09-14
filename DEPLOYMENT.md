# Build and Deployment Guide 🚀

This document outlines the build process, local development setup, testing workflows, and deployment options for **Suburbia**.

---

## Overview

Suburbia is an interactive client-side web application built with:
- **Framework**: React 18+ with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Vector Maps**: High-performance inline SVG with mathematical coordinate projections
- **Icons**: Lucide React
- **Architecture**: 100% client-side Single Page Application (SPA). No backend or database required; runs directly in any modern browser.

---

## Local Development

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Getting Started

```bash
# 1. Clone repository (if applicable) and enter project directory
cd Suburbia

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The development server will start and bind to `http://localhost:3000`.

---

## Building for Production

To create an optimized production build:

```bash
npm run build
```

This compiles TypeScript, optimizes Tailwind CSS, and outputs static production assets to the `dist/` directory.

### Code Quality & Verification

```bash
# Run TypeScript type-checker
npm run lint

# Run full topological and dataset integrity test suite
npx tsx scripts/verifyAllDatasets.cjs
```

The verification suite audits all playable city datasets to guarantee:
1. Suburb ID uniqueness
2. Polygon boundary validity and coordinate bounding boxes
3. 100% symmetric adjacency edges across all borders
4. Single-component graph reachability from each city's CBD
5. Complete canonical daily challenge schedule (2,191 days from 2025-01-01 to 2030-12-31), verifying every puzzle is solvable in **strictly 5 steps**.

---

## Deployment Options

Because Suburbia is a fully static client-side application, the compiled `dist/` directory can be hosted on any static web hosting platform.

### 1. GitHub Pages (Automated via GitHub Actions)

The repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Every push to the default branch will automatically trigger the build and deploy Suburbia to GitHub Pages.

### 2. Manual Static Hosting (Netlify, Vercel, Cloudflare Pages, S3)

```bash
npm install
npm run build
```

Deploy the resulting `dist/` folder:
- **Cloudflare Pages**: Connect your Git repo or run `npx wrangler pages deploy dist`.
- **Netlify**: Drag-and-drop `dist/` into the Netlify dashboard or link the repository with build command `npm run build` and publish directory `dist`.
- **Vercel**: Deploy using `npx vercel` with output directory set to `dist`.
- **AWS S3 + CloudFront**: Sync `dist/` to an S3 bucket configured for static website hosting with index document `index.html`.

### 3. Docker / Container Ingress

For containerized hosting (e.g. Google Cloud Run, AWS ECS, or Kubernetes):

```dockerfile
# Example multi-stage production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
RUN sed -i 's/80/3000/g' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
```
