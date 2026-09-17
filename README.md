# Midnight Munch

A responsive, one-button Canvas survival game engineered for YouTube Playables. Rascal, a female raccoon, drives a snack cart through a midnight amusement-park parking lot while security bots pursue her. Tap, click, or press Space to reverse her drift, gather popcorn, dodge hazards, and trick bots into crashing.

## Quick Start

```sh
# Install dependencies
npm install

# Run locally in dev server
npm run dev

# Build production web bundle to dist/
npm run build

# Build and package submission-ready ZIP for YouTube Playables
npm run package
```

The packaging script (`npm run package`) compiles the project and generates `midnight-munch.zip` with `index.html` at the root, strictly relative asset paths, and full compliance under YouTube's 10 MB limit (current package: ~1.7 MB).

## Included Features

- **One-Button Drift Steering**: Automatic forward drive with instant drift direction reversal on Tap, Click, or Spacebar.
- **Dynamic Hazards**:
  - *Scooter Bots*: Agile pursuit bots with turn-rate clamping and perimeter warnings.
  - *Heavy Security Carts*: High-mass carts that deflect light bots.
  - *Sweeper Cart*: Timed rotating obstacle with sweeping arm and outsmart bonus (`SWEEPER SMASH!`).
  - *Strategic Landmarks*: Snack booth, parked truck, and planter island spaced with guaranteed perimeter highways.
- **Scoring & Multipliers**: Popcorn snack streaks (up to 5×), rare Golden Donuts, 2× Snack Frenzy bags, near-miss escapes (`SQUEAKED BY!`), and mischief combo chains.
- **Audio & Presentation**: Procedural 132 BPM carnival chiptune groove synthesized via Web Audio (0 KB asset footprint), interactive sound toggle (🔊/🔇), screen shake, and animated carnival rides.
- **Trophy Room Showcase**: Interactive achievement showcase displaying 6 unlockable stunt badges with unlock status, descriptions, and progress counters.
- **YouTube Playables Cloud Integration**: Official SDK lifecycle hooks (`firstFrameReady`, `gameReady`, pause/resume, audio sync) and cloud persistence (`ytgame.storage.loadData` / `saveData`) with automatic race-condition protection and local storage fallback.
- **Development & Practice Tools**: In-game debug drawer (`⚙`) with invincibility, speed slider, multiplier, bot spawner, and on-demand sweeper cart trigger.

## Project Structure

- `src/core/Game.ts` — Game loop, steering, pursuit, spawning, collision, scoring, and lifecycle.
- `src/rendering/Renderer.ts` — Canvas 2D arena, Rascal, security bots, snacks, rides, and particles.
- `src/audio/AudioManager.ts` — Web Audio procedural chiptune soundtrack and tone effects.
- `src/save/SaveManager.ts` — Synchronous cache and asynchronous YouTube Playables cloud save sync.
- `src/platform/PlatformAdapter.ts` — YouTube SDK isolation point (`window.ytgame`).
- `src/core/achievements.ts` — Achievement stunt definitions.
- `scripts/package.mjs` — Automated packaging tool generating `midnight-munch.zip`.
- `IMPLEMENTATION_PLAN.md` — Full architecture and milestones roadmap.
