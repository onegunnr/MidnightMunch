# Orbit Drift enhancement update

This is the standalone Orbit Drift game. Launch `index.html` through a local HTTP server with `enhancements.js` and `assets/` alongside it. The root Vite development server serves it at `/tracker/Orbit%20Drift/`; the root production build belongs to Midnight Munch, not this game.

- First drone warning at 0.8 seconds; activation around 2 seconds. If the player moves dangerously close to a warning, relocation and a fresh warning take priority over timing.
- Opening drone speed is reduced 35%, with gentler steering and prediction. Difficulty ramps smoothly after 25 seconds; population grows every 22 seconds.
- Spawn distance uses the shortest wrapped path, including on phones. Failed asteroid placements are skipped rather than accepting unsafe positions.
- Opening coins lie ahead of the ship. Random coins, gems and power-ups spawn every 2.5 seconds; relic opportunities every 20 seconds beginning at 18 seconds. Placement checks asteroid, drone and gravity-well clearance. Pickups expire, keeping the arena bounded.
- Coin 50, gem 150, relic 500, energy 200, power-ups 25 points before combo bonuses. Relics last 12 seconds; ordinary pickups last 25 seconds. All pulse and display values or labels, with floating earned points and distinct tones.
- Shield absorbs one hit and grants 2.5 seconds of protection. Slow lasts 6 seconds. Magnet lasts 8 seconds and works across screen boundaries.
- Artifacts, near misses and drone crashes share a visible combo. Each run has a 500-point mission: 10 pickups, 3 destroyed drones or 3 near misses.
- Patrols appear after 30 seconds, heavy rammers after 40, and straight-line chargers after 55. All have labeled spawn warnings; chargers telegraph their direction before accelerating.
- Relaxed, Normal and Challenge have separate saved records. Relaxed starts with a shield. Normal's old high score is preserved. Training cannot earn scores or cosmetic achievements.
- Nebula, Aurora and Ember palettes combine with randomized asteroid arrangements. Missions unlock a neon ship/trail; relics unlock a gold ship and star gems. Surviving 60 seconds earns an achievement.
- First-run prompts teach steering, collecting and baiting. Learn to Play supplies invincible training; Menu exits back to mode selection.
- Results show collision cause, gameplay time, scoring breakdown and the gap to the mode's best. Gravity wells and input are cleared on restart.

Validation: run `node tests/orbit-gameplay.mjs` from the workspace root. Regression tests cover desktop, portrait and landscape dimensions, timing, wrapped spawn safety, pickup collection/expiry, shields, powers, missions, records, training, reset and rendering. Browser checks cover the desktop/phone menu and live phone HUD with no console errors.
