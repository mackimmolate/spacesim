# SpaceSim Prototype

A Vite + TypeScript + Three.js prototype for a deterministic space-company sim. The simulation loop runs at a fixed timestep with a seeded RNG, and a DOM overlay provides controls, status, and save/load tools.

## Requirements

- Node.js 18+
- npm 9+

## Quick start

```bash
npm install
npm run dev
```

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

Run tests:

```bash
npm test
```

## Project structure

```
src/
  engine/   # Fixed-timestep loop + speed controls
  input/    # Input aggregation (pause/step/speed/seed)
  sim/      # Deterministic state, RNG, tick/update logic
  render/   # Three.js renderer (space + interior + overlays)
  ui/       # DOM overlay screens and dock
```

## Determinism guarantees

- Simulation logic never reads globals (no Math.random inside the sim). It advances exclusively through `advanceState(state, dt, input)` using the RNG state stored in `GameState`.
- `rngState` is derived from the seed string and threaded through each tick.
- Given the same seed + inputs + tick count, you get the same state hash. See `src/sim/sim.test.ts`.

## Saving and loading

- **Save** writes a JSON payload to `localStorage`.
- **Load** reads the saved payload from `localStorage`.

## Controls

- **W/A/S/D or Arrow Keys**: move (avatar mode) or pan (command mode).
- **Mouse wheel, + / -**: zoom camera in/out.
- **Space**: pause/resume.
- **Period (.) or O**: step once.
- **N**: new simulation seed.
- **R**: reset camera.
- **M**: toggle sector map (command mode).
- **E**: interact (avatar mode).
- **Escape**: exit command mode or close open screens.

Dock screens:

- **P**: Personnel
- **C**: Contracts
- **K**: Controls

The Controls screen includes buttons for pause/resume, speed, save/load, reset, and regenerate visuals.

## GitHub Pages (project site) deploy

This repository is a GitHub project site, so the Vite `base` is set to `/spacesim/` for production builds.

### Workflow

The GitHub Actions workflow builds and deploys the `dist/` directory to GitHub Pages.

1. In GitHub, go to **Settings -> Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the default branch (or run the workflow manually).

The deployment URL appears in the Actions run output and under the **github-pages** environment. The site will be available at:

```
https://<username>.github.io/spacesim/
```

## Post-build SPA refresh fix

After every build, `scripts/postbuild.mjs` copies `dist/index.html` to `dist/404.html` so that direct URL refreshes resolve to the SPA entry point.
