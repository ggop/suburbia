# Agent Instructions & Project Invariants

## Core Gameplay Rules
- **No Map Suburb Selection**: Players must NOT be able to select or advance to the next suburb directly by clicking on the map. Direct suburb selection via map click is strictly forbidden.
- **Selection Exclusively via "Available Neighbours" List**: All player selections must be made exclusively from the "Available Neighbours" list in the game controls panel (`GameControls.tsx` — available in both the desktop sidebar and the mobile drawer carousel).
- **Map Viewport Role**: Clicking or tapping suburbs on the map is for inspection and panning/zooming. It must never trigger move or advance actions, and if a player clicks on the map while playing, it directs them to the "Available Neighbours" list.
- **Confetti**: Win celebration uses the reliable multi-burst colorful confetti particles.
- **Target Border Turn Rule**: Once a bordering suburb of the destination is reached, the route connects to the target for free/automatically without counting the target as an extra turn.
- **Daily Challenge Deployment Stability**: Today's Daily Challenge puzzle must remain completely immutable and identical across any number of deployments made on the same day. It is locked using a canonical schedule (`src/data/canonicalDailyChallenges.ts`) so that code updates, map model changes, or multiple daily deployments never alter the challenge for that date.

## Rules for Adding a New City
Follow these mandatory steps every time a new city is added to the list:
- **Playable Cities in README**: Update the `README.md` to only show playable cities and remove any hidden cities.
- **Ensure All Datasets Listed in README**: Ensure all datasets are listed in the `README.md` with their authoritative cadastral sources, hydrography/coastlines, demographics/heritage metadata, and key bridges/crossings.
- **Ensure 5-Step Solvability**: Ensure each daily puzzle is solvable in exactly 5 steps (shortest path = strictly 5 steps between start and target suburbs).
- **Daily Puzzles Horizon**: Add daily puzzles till Dec 31 2030 (all 2,191 dates from 2025-01-01 to 2030-12-31 pre-computed and locked in canonical schedule files).

