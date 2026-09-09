# Agent Instructions & Project Invariants

## Core Gameplay Rules
- **No Map Suburb Selection**: Players must NOT be able to select or advance to the next suburb directly by clicking on the map. Direct suburb selection via map click is strictly forbidden.
- **Selection Exclusively via "Available Neighbours" List**: All player selections must be made exclusively from the "Available Neighbours" list in the game controls panel (`GameControls.tsx` — available in both the desktop sidebar and the mobile drawer carousel).
- **Map Viewport Role**: Clicking or tapping suburbs on the map is for inspection and panning/zooming. It must never trigger move or advance actions, and if a player clicks on the map while playing, it directs them to the "Available Neighbours" list.
- **Confetti**: Win celebration uses the reliable multi-burst colorful confetti particles.
- **Target Touch Turn Rule**: If a turn directly touches the target suburb, the game must not count the target as an extra turn. Connecting to the target is free/automatic once a bordering suburb is reached.
- **Daily Challenge Deployment Stability**: Today's Daily Challenge puzzle must remain completely immutable and identical across any number of deployments made on the same day. It is locked using a canonical schedule (`src/data/canonicalDailyChallenges.ts`) so that code updates, map model changes, or multiple daily deployments never alter the challenge for that date.
