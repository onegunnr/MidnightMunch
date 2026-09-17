# Midnight Munch — implementation plan

Status: Midnight Munch steering-and-pursuit prototype is implemented. This document remains the roadmap for modular extraction, expanded progression, final art, cloud saves, and hosted validation.

## 1. Concept and story

Midnight Munch is a one-button survival game viewed from above. Rascal, a female raccoon, has taken a snack cart for an unauthorized midnight run through a closed amusement park. She collects food for her animal friends waiting outside while security robots chase her.

The emotional hook is being a clever, mischievous getaway driver: weave past pursuers, grab popcorn, and trick security bots into crashing into each other. Communicate the story through menu artwork and one sentence: “Grab the snacks. Dodge security. Feed your friends.” No cutscene or dialogue delays play.

Working title: **Midnight Munch**. Main instruction: **“Tap to switch your drift.”** Endless runs have no mandatory snack quota or narrative ending.

## 2. Rascal: main character

Rascal is a female cartoon raccoon; use she/her consistently. Her femininity comes through her face, clothing, and expressive animation while retaining a recognizable raccoon silhouette.

- Expressive eyes with subtle lashes, rounded cheeks, and a mischievous grin.
- A swept fur tuft beneath an oversized yellow delivery helmet.
- A short purple racing jacket, purple neck scarf, and driving gloves.
- A compact cartoon build, raccoon face mask, and large striped tail.
- A turquoise snack cart with purple accents and a visible popcorn basket.
- Confident, resourceful, generous toward her friends, and slightly reckless.

The gameplay silhouette emphasizes helmet, cart, scarf, and tail. Larger menu and game-over portraits show her facial details. Decorative scarf and tail motion do not enlarge the collision shape. When caught, she tumbles harmlessly into popcorn; keep the tone playful and appropriate for a broad 13+ audience.

## 3. Controls and movement

The cart moves forward automatically and continuously curves left or right. Each tap, mouse click, or Space press reverses its turning direction. It does not reverse its forward velocity or snap its heading. Holding an input has no additional effect.

There are no directional buttons, throttle, brake, jump, or weapon. Steering is relative to the cart's heading. Clearly distinguish its front and show a small curved direction indicator during the opening seconds.

Initial simulation:

```text
on primary action: turnDirection *= -1
heading += turnDirection * turnRate * dt
position += forwardVector(heading) * speed * dt
turnRadius = speed / turnRate
```

Start with direct heading movement and cosmetic skid, body lean, and tire trails. Realistic traction and lateral inertia are deferred. Initial tuning hypotheses: 160 world units/second and a 105-unit turn radius. Keep parameters in configuration. Preserve a predictable radius as speed rises by scaling angular rate within tuned limits.

Use a fixed 60 Hz simulation with interpolated rendering. Starting input begins the run without also reversing steering. Each later input produces exactly one reversal; ignore key repeats and button-event duplication.

## 4. Arena, boundaries, and responsive layout

Prototype one open parking lot outside the amusement park. Use a fixed square arena, initially 900×900 world units, with decorative surroundings. The player can steer anywhere inside; there is no track or forced orbit.

For the first prototype, arena edges gently reflect the cart inward rather than ending the run. Clamp the cart inside the boundary, reflect its heading once per crossing, and show a bumper response. Retain its selected turning direction. This boundary rule is provisional and must be tested for confusion and corner trapping. Fatal threats are security bots and clearly marked dangerous obstacles.

Keep the full square arena visible in portrait and landscape. The canvas and scenery fill the viewport; spare space around the uniformly scaled arena supports UI and park scenery. Avoid shrinking a landscape world into a narrow strip in portrait.

1280×720 remains the baseline UI design resolution, not a forced arena aspect ratio. Keep DOM labels readable independently of world scale. Place portrait HUD above the arena; use compact landscape HUD around the playfield. Honor safe-area insets, minimum 48×48 CSS-pixel touch targets, and one-handed input anywhere outside UI controls. Never lock orientation or create scrollbars.

Resizing changes camera transforms and layout only. It must not move entities, alter arena bounds, change physics, or reset spawn timing.

## 5. Gameplay loop

1. Show Rascal, a large PLAY button, best score, and the control instruction.
2. Start moving immediately after the first action, with a short safe opening.
3. Collect popcorn while changing drift direction to evade security.
4. Award close escapes only after the encounter ends safely.
5. Lure two bots into each other for an OUTSMARTED bonus.
6. Gradually increase pursuit pressure and introduce new behavior.
7. A fatal collision immediately stops gameplay scoring and control.
8. Show score, best score, best snack streak, near-miss count, and PLAY AGAIN with a brief popcorn burst.
9. Restart in under one second without reloading assets or the page.

Target typical runs of 30–90 seconds after playtesting, not an enforced time limit. Require a fresh action after the fatal frame so a queued evasive tap cannot accidentally restart.

## 6. Enemies, hazards, and fairness

### Security bot: prototype enemy

Bots steer toward Rascal with capped angular speed and a short reaction delay. Their wider turning radius makes well-timed reversals useful. Start with one bot; add a second after players have a chance to understand steering.

Use simple pursuit: calculate the direction to the player, turn toward it within limits, and advance. Add limited prediction only if necessary after testing. Bots must not instantly rotate or perfectly mirror player input.

When two active bots collide, disable both once, award one OUTSMARTED event, and produce cosmetic mechanical debris. Replace them only after a brief opening. Track collision pairs so one crash cannot score twice.

### Expanded content

| Element | Behavior | Timing |
| --- | --- | --- |
| Security bot | Slow-turning pursuit; crashes into other bots | Prototype |
| Cone cluster | Stationary hazard with open routes around it | After steering validation |
| Sweeper cart | Crosses the arena after a marked path warning | Later progression |
| Golden donut | Rare reachable bonus reward | Retention pass |
| Soda spill | Temporarily modifies handling with explicit feedback | Deferred |

Projectiles are not required for the prototype. Establish pursuit and outsmarting before adding further mechanics.

### Spawn and collision rules

- Show perimeter warnings before threats activate; initial warning target is at least 1.2 seconds.
- Enforce minimum time-to-contact at the highest supported speed.
- Reject placements overlapping entities or the player's immediate safety radius.
- Preserve viable escape space; postpone spawning if placement checks fail.
- Cap active threats rather than allowing unlimited growth.
- Use swept relative-motion collision checks for fast crossings.
- Use forgiving circles/capsules inside vehicle artwork; tails and scarves do not collide.
- Fatal player contact takes priority over reward events in the same simulation step.

## 7. Scoring, snacks, and near-misses

Initial tuning values:

| Event | Reward |
| --- | --- |
| Survival | 10 points per active second |
| Popcorn | 25 points × multiplier |
| Golden donut | 150 points × multiplier |
| Near-miss | 50 points × multiplier |
| Two bots outsmarted | 100 points × multiplier per crash pair |

Survival scoring is independent of the multiplier. Preserve fractional points internally and display integers.

### Near-miss rules

Track each player/threat encounter. Enter a narrow clearance band outside the collision boundary, record minimum separation, then award only after exiting safely while separating. Fatal contact cancels the pending reward.

Use separate entry/exit margins and a per-threat cooldown, initially two seconds, to prevent jitter or continuous close circling from generating rewards every frame. Display “SQUEAKED BY!” for safe escapes and “OUTSMARTED!” for bot crashes. Rate-limit messages and place them away from the driving path.

### Snack streak

Place short popcorn trails in reachable open space, clear of obstacles and edges. A pickup refreshes a visible snack streak timer, initially five active seconds. Every five normal pickups raises the multiplier by one, capped at 5×.

Passing a snack does not count as missing it: players can circle back. Reset the streak when its timer expires. A golden donut refreshes the timer but does not count as multiple popcorn pickups. Near-miss and crash bonuses use the current multiplier without extending the snack streak.

Suspend the streak timer when paused. Replenish reachable snacks so generator starvation does not break streaks unfairly.

## 8. Progression and retention

Raise pressure through bot count, modest speed increases, approach timing, and later crossing hazards. Cap speed and steering changes so learned controls remain useful.

| Active time | Proposed progression |
| --- | --- |
| 0–15 seconds | Safe opening, popcorn trail, one slow bot |
| 15–30 seconds | Second bot; first pursuer-collision opportunity |
| 30–50 seconds | Slight speed increase and varied approach timing |
| 50–75 seconds | Introduce a warned sweeper in the expanded version |
| 75+ seconds | Bounded combinations of established threats |

These are tuning bands. The first prototype uses bots alone and tests whether pursuit variation sustains interest.

Persist best score, best snack streak, longest survival, run count, and achievements. Compare personal-best celebrations against the record captured at run start; announce crossing it once per run. Celebrate configurable score milestones without interrupting play.

Initial achievements: first completed run, five near-misses in a run, first OUTSMARTED crash, ten-snack streak, first golden donut, and surviving 60 seconds. Maintain explicit run counters so recycling entities cannot erase achievement evidence.

## 9. Asset pipeline

Start with Canvas-generated placeholders using the final palette: turquoise cart, yellow helmet, purple accents, and distinctly shaped security bots. The first build needs a parking lot, cart, one bot type, popcorn, and simple effects.

After movement validation, create original SVG or small raster assets for Rascal's menu/caught portraits, top-down cart and driver, security bots, sweeper, snack icons, park surroundings, and small effect textures. Optional image generation can explore character art or backgrounds later; collision-critical silhouettes must remain controlled and readable.

Use bright cartoon lighting over deep-blue nighttime scenery. Preserve obstacle contrast. Streak intensity adds bounded trails and sparkle without concealing hazards. Crash shake affects the world, not UI. Support reduced motion.

Begin with synthesized pickup notes, turn chirps, bot-crash pops, and a caught sting. Audio is optional for understanding play. Final music and illustration are not startup dependencies. Bundle assets locally with relative paths; document licenses if any third-party content is introduced.

## 10. Technology and folder structure

Retain TypeScript, Vite, Canvas 2D, HTML/CSS overlays, and Web Audio. Use Vitest for deterministic simulation tests and Playwright for browser checks when implemented. No gameplay servers, external fonts, advertising SDKs, or second rendering framework.

```text
/
  IMPLEMENTATION_PLAN.md
  README.md
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  public/assets/
    characters/
    arena/
    audio/
  src/
    main.ts
    styles.css
    config/
      gameplay.ts
      theme.ts
    core/
      Game.ts
      GameStateMachine.ts
      GameLoop.ts
      InputManager.ts
      Viewport.ts
      Random.ts
      types.ts
    entities/
      PlayerCart.ts
      SecurityBot.ts
      Hazard.ts
      Collectible.ts
    systems/
      SteeringSystem.ts
      PursuitSystem.ts
      SpawnDirector.ts
      CollisionSystem.ts
      NearMissSystem.ts
      CollectibleManager.ts
      DifficultyDirector.ts
      ScoreSystem.ts
      AchievementSystem.ts
    rendering/
      Renderer.ts
      ArenaRenderer.ts
      ParticleSystem.ts
      TrailRenderer.ts
    audio/AudioManager.ts
    ui/UIManager.ts
    save/
      SaveManager.ts
      saveSchema.ts
    platform/
      PlatformAdapter.ts
      BrowserAdapter.ts
      YouTubeAdapter.ts
    dev/DevPanel.ts
    tests/
      steering.test.ts
      pursuit.test.ts
      collision.test.ts
      scoring.test.ts
      save.test.ts
      lifecycle.test.ts
  e2e/
    gameplay.spec.ts
    responsive.spec.ts
    platform.spec.ts
```

Create modules as milestones need them; avoid empty scaffolding. Extract simulation and scoring from the existing large Game class. Prefer composition and typed state to deep inheritance.

## 11. Class responsibilities

| Class/system | Responsibility |
| --- | --- |
| Game | Compose services, own run lifecycle/reset, publish events |
| GameStateMachine | BOOT, MENU, PLAYING, GAME_OVER; separate suspension flag |
| GameLoop | Fixed-step simulation, render interpolation, bounded catch-up, suspension |
| InputManager | Normalize pointer/Space; suppress repeats and UI duplicate activation |
| Viewport | Fit square arena, size canvas, position safe-area-aware UI |
| PlayerCart | Position/previous position, heading, turn direction, speed, hitbox, alive state |
| SteeringSystem | Reversals, movement integration, boundary reflections |
| SecurityBot | Position, heading, warning/active/disabled state, pursuit settings |
| PursuitSystem | Capped-turn enemy steering independent of render rate |
| SpawnDirector | Seeded schedules, warning duration, safety checks, enemy cap |
| CollisionSystem | Swept collisions, bot-pair contacts, single fatal result |
| NearMissSystem | Encounter entry/exit, clearance, cooldowns, safe-pass events |
| CollectibleManager | Reachable placement, pickup checks, replenishment, expiration |
| DifficultyDirector | Bounded threat parameters from active elapsed time |
| ScoreSystem | Survival score, bonuses, streak timer, multiplier, milestones |
| AchievementSystem | Explicit run counters and lifetime progress |
| Renderer / ArenaRenderer | Render simulation state without changing it |
| ParticleSystem / TrailRenderer | Bounded cosmetic effects and trail history |
| AudioManager | Interaction unlock, sound playback, platform mute/suspension |
| UIManager | Menu, HUD, results, buttons, limited accessible announcements |
| SaveManager | Validation, migration, serialized writes, load-race protection |
| PlatformAdapter | Readiness, lifecycle, audio, persistence interface |
| DevPanel | Development-only tuning, spawning, seeds, collision diagnostics |

Use direct calls for simulation and typed events for snackCollected, nearMiss, botsCrashed, milestone, and runEnded. UI/audio/effects react to results; they never determine scores or collisions.

## 12. Simulation order and lifecycle

Each fixed step:

1. Consume valid primary actions.
2. Update active time and difficulty.
3. Advance spawn warnings; activate safe eligible threats.
4. Store previous positions and move player/bots.
5. Resolve swept collisions; a fatal hit ends the run and stops rewards for this step.
6. Resolve bot crashes, pickups, and completed near-misses.
7. Advance survival score, streak timer, milestones, and achievement counters.
8. Recycle disabled entities and update effects.

Cap catch-up steps after stalls. Reset the accumulator on resume rather than simulating paused time. Stop animation scheduling, simulation, rendering, gameplay input, and audio during platform suspension. Use simulation time for gameplay timers and feedback duration.

Restart clears entities, pending inputs, encounters, cooldowns, score, trails, and run statistics while preserving resources and subscriptions. Use a run identifier for asynchronous work. Provide disposal so reloads cannot duplicate loops or listeners.

## 13. Persistence and YouTube integration

Use a new browser namespace, midnight-munch-save-v1. Cloud Hopper scores are not comparable: do not import or delete them.

```ts
interface MidnightMunchSaveV1 {
  version: 1;
  gameId: "midnight-munch";
  bestScore: number;
  bestSnackStreak: number;
  longestRunSeconds: number;
  totalRuns: number;
  achievements: string[];
  settings: { soundEffects: boolean; reducedMotion: boolean };
}
```

Validate numeric ranges and known achievement identifiers. Serialize/coalesce writes and protect against delayed loads overwriting new progress. Handle storage failure without crashing play or falsely reporting persistence.

Standalone mode uses BrowserAdapter and local storage. Hosted mode uses YouTubeAdapter and SDK persistence exclusively, awaiting successful load before saving. No silent local-storage fallback in hosted mode.

During hosted implementation, verify official SDK namespaces, environment detection, callback signatures, initialization, and persistence behavior. The current adapter is a starting point, not evidence of correct hosted behavior.

Planned adapter capabilities: first-frame and game-ready notifications, full pause/resume, audio-state changes, awaited load/save, and disposal. Notify ready only when interaction is available. Browser visibility behavior belongs only to the standalone adapter. Mock tests precede real host validation.

Official references to consult during integration:

- [SDK reference](https://developers.google.com/youtube/gaming/playables/reference/sdk)
- [Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)

A standalone working game or mock adapter is not a certification claim.

## 14. Development controls

Provide invincibility, difficulty stage, speed, turn radius, enemy speed/turn rate, active-enemy cap, score multiplier, specific threat spawning, collision/near-miss visualization, spawn-warning visualization, and seeded restart.

Any override marks the current run as practice and disables record/achievement writes. Continuing overrides also mark subsequent runs. Exclude development UI, shortcuts, and hooks from production.

## 15. Replacing Cloud Hopper

1. Retain build setup and inspect reusable input, random, audio, and rendering utilities.
2. Replace branding, menu copy, robot, track, jump physics, barrier spawning, and runner scores.
3. Extract reusable lifecycle and simulation responsibilities into the modules above.
4. Implement arena and cart movement before adding pursuers.
5. Replace energy collectibles with popcorn and arena-appropriate streak rules.
6. Introduce the separate save namespace while leaving old records untouched.
7. Update README to describe Midnight Munch and actual implementation status.
8. Verify production output has no obsolete Cloud Hopper UI or active runner behavior.

Cloud Hopper will not remain as a second shipped mode. This is a replacement direction.

## 16. Delivery milestones

### Milestone 1: steering and pursuit prototype — implemented

Build cart steering, square arena, boundary handling, input parity, one security-bot type, safe warnings, collision, survival score, menu/results, instant restart, and local best-score saving. Include popcorn, safe near-misses, and two-bot collisions to demonstrate the core risk/reward loop.

Implemented: cart steering, square arena, boundary reflection, input parity, warning spawns, security-bot pursuit, bot crashes, snacks, streaks, near-miss rewards, score persistence, menus, results, and instant restart. Browser smoke tests cover menu/start/caught/retry and an arena visual review. Test portrait and landscape further before spending time on final artwork.

### Milestone 2: retention and balance

Add streak multipliers, golden donuts, achievements, personal-best notifications, milestones, gradual difficulty, and full development controls. Test whether unchanged circular motion or rapid tapping can evade bots indefinitely. Tune pressure without obscuring the input rule.

Observe first-run comprehension, retry behavior, deaths, and run duration locally. Refine toward 30–90 second typical runs. No external analytics service is required.

### Milestone 3: character and presentation

Finalize Rascal's feminine cartoon design, portraits, cart, bots, park scenery, trails, snack bursts, clear feedback, and audio. Add the sweeper only if pursuit needs variety. Validate readability and reduced motion.

### Milestone 4: hosted delivery

Complete SDK lifecycle/audio/save integration, validate with available host tooling, audit package size and relative paths, and document remaining certification work accurately.

## 17. Verification and performance

Meaningful automated checks:

- Exactly one reversal per press; no heading snap or held-key repeat.
- Equivalent input timing produces equivalent motion at different render rates.
- Boundary reflection does not trap or repeatedly flip the player.
- Bots obey turn limits and spawn warning/clearance constraints.
- Swept collision catches opposing fast motion.
- Near-misses score only on safe exit, obey cooldowns, and never reward fatal contact.
- Bot crashes score once, including multi-bot contacts.
- Streak timers pause correctly; scoring is frame-rate independent.
- Achievements retain full-run counters after recycling entities.
- Corrupt saves, delayed loads, failed loads, and concurrent writes preserve valid records.
- Practice runs cannot change saved records.
- Restart/resume maintain one loop and one input subscription set.

Browser checks: menu/start/caught/retry, click/touch/Space parity, no scrollbars or text selection, minimum touch targets, resize during pursuit, and layouts at 360×640, 390×844, 640×360, 768×1024, 1280×720, and wide desktop. Use real mobile/host testing when available.

Targets: first interaction under five seconds, restart under one second, and smooth 60 FPS on representative devices. Initially cap pixel ratio at two, active threats around six, and particles around 150; adjust using measured performance. Bound allocations and HUD updates. Do not continuously announce changing scores through live regions.

Aim for under 1 MiB compressed prototype startup content and under 10 MiB final assets. Report startup transfer bytes separately from package size; check current platform package/file limits before submission. These are budgets, not achieved claims.

## 18. Scope boundaries

No multiplayer, accounts, online leaderboards, advertising, paid upgrades, backend services, complex level pipeline, or realistic vehicle simulation in the prototype. Defer projectiles and handling-altering soda until steering is validated. The first deliverable is a readable, funny, replayable chase starring Rascal.
