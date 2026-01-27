# SpaceSim Prototype

A Vite + TypeScript + PixiJS scaffold for a deterministic space-company sim prototype. The simulation loop is fixed-timestep, deterministic with a seeded RNG, and rendered with a PixiJS starfield plus a simple ship marker. A DOM overlay provides controls, status, and save/load tools.

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
  render/   # PixiJS renderer (parallax starfield, ship)
  ui/       # DOM overlay controls and status
```

## Determinism guarantees

* Simulation logic never reads globals (no Math.random inside the sim). It advances exclusively through `advanceState(state, dt, input)` using the RNG state stored in `GameState`.
* `rngState` is derived from the seed string and threaded through each tick.
* Given the same seed + inputs + tick count, you get the same state hash. See `src/sim/sim.test.ts`.

## Saving, loading, and JSON export

* **Save** writes a JSON payload to `localStorage`.
* **Load** reads the saved payload from `localStorage`.
* **Export JSON** fills the textarea with the current save payload.
* **Import JSON** parses the textarea content and restores the sim.

## Controls

* **W/A/S/D or Arrow Keys**: pan the camera.
* **+ / -**: zoom camera in/out.
* **R**: reset camera.
* **C**: cycle sim speed.
* **N**: new simulation seed.
* **Regenerate Visuals**: keeps the sim state but rebuilds the starfield/planets with a new render seed.

## GitHub Pages (project site) deploy

This repository is a **GitHub project site**, so the Vite `base` is set to `/spacesim/` for production builds.

### Workflow
The GitHub Actions workflow builds and deploys the `dist/` directory to GitHub Pages.

1. In GitHub, go to **Settings -> Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the default branch (or run the workflow manually).

The deployment URL appears in the **Actions** run output and under the **github-pages** environment. The site will be available at:

```
https://<username>.github.io/spacesim/
```

## Post-build SPA refresh fix

After every build, `scripts/postbuild.mjs` copies `dist/index.html` to `dist/404.html` so that direct URL refreshes resolve to the SPA entry point.
