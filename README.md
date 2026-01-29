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

## Asset credits

The following third-party assets are used under CC-BY licenses. Please keep attribution to the original authors as listed at the source URLs.

* Sci-Fi Chairs Demo — https://sketchfab.com/3d-models/sci-fi-chairs-demo-52f3a90005ba446bb3c95caac255f7cd
* Sci-Fi Computer Desk Console — https://sketchfab.com/3d-models/sci-fi-computer-desk-console-28c67457f2ef4973a0bbc8b667bb183f
* Sci-Fi Computer Console — https://sketchfab.com/3d-models/sci-fi-computer-console-05ace13ccbd048eb9c6c55ac3c3d8501
* Sci-Fi Military Canteen — https://sketchfab.com/3d-models/sci-fi-military-canteen-313dfe4dcaed46b9b4b3ffe173e48abe

Lighting environment:

* Poly Haven HDRI "studio_small_03" — https://polyhaven.com/a/studio_small_03 (CC0)
