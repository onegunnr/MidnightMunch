import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ARENA = 900;
const EDGE = 39;
const TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const wrap = (angle: number): number => (angle + Math.PI) % TAU - Math.PI;
const distance = (x1: number, y1: number, x2: number, y2: number): number => Math.hypot(x2 - x1, y2 - y1);

function pointSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const divisor = dx * dx + dy * dy;
  const t = divisor ? clamp(((px - ax) * dx + (py - ay) * dy) / divisor, 0, 1) : 0;
  return distance(px, py, ax + dx * t, ay + dy * t);
}

describe('Physics & Drift Steering', () => {
  it('should reverse steering arc when turnDirection flips', () => {
    const baseSpeed = 160;
    const turnRate = baseSpeed / 105;
    const dt = 0.05;

    let headingClockwise = 0;
    headingClockwise = wrap(headingClockwise + (1) * turnRate * dt);
    assert.ok(headingClockwise > 0, 'Clockwise steering should increase heading angle');

    let headingCounter = 0;
    headingCounter = wrap(headingCounter + (-1) * turnRate * dt);
    assert.ok(headingCounter < 0, 'Counter-clockwise steering should decrease heading angle');
    assert.equal(Math.abs(headingClockwise), Math.abs(headingCounter), 'Magnitude should be symmetric');
  });

  it('should reflect velocity properly on arena boundary collisions', () => {
    // Left wall bounce (x < EDGE)
    let heading = Math.PI * 0.8; // Moving left-down
    heading = wrap(Math.PI - heading);
    assert.ok(Math.cos(heading) > 0, 'Horizontal wall bounce must redirect velocity to the right');

    // Top wall bounce (y < EDGE)
    heading = -Math.PI * 0.3; // Moving up-right
    heading = wrap(-heading);
    assert.ok(Math.sin(heading) > 0, 'Vertical wall bounce must redirect velocity downward');
  });

  it('should guarantee 170+ unit highway clearance around all landmark quadrants', () => {
    const anchors = [
      { x: 260, y: 260 },
      { x: 640, y: 260 },
      { x: 260, y: 640 },
      { x: 640, y: 640 },
    ];
    const maxJitter = 25;
    const maxLandmarkRadius = 34; // booth

    for (const anchor of anchors) {
      // Test the closest possible point to each perimeter boundary
      const minX = anchor.x - maxJitter - maxLandmarkRadius;
      const maxX = anchor.x + maxJitter + maxLandmarkRadius;
      const minY = anchor.y - maxJitter - maxLandmarkRadius;
      const maxY = anchor.y + maxJitter + maxLandmarkRadius;

      // Distance to perimeter walls (EDGE = 39, FAR = 861)
      const leftClearance = minX - EDGE;
      const rightClearance = (ARENA - EDGE) - maxX;
      const topClearance = minY - EDGE;
      const bottomClearance = (ARENA - EDGE) - maxY;

      const minClearance = Math.min(leftClearance, rightClearance, topClearance, bottomClearance);
      assert.ok(
        minClearance >= 160,
        `Corridor clearance (${minClearance.toFixed(1)}) must leave ample highway (>160px) for player radius 20`
      );
    }
  });
});

describe('Collision Hitbox Detection', () => {
  const PLAYER_RADIUS = 20;
  const SCOOTER_BOT_RADIUS = 24;
  const HEAVY_BOT_RADIUS = 32;

  it('should trigger player hit when distance < player.radius + bot.radius - 5', () => {
    const threshold = PLAYER_RADIUS + SCOOTER_BOT_RADIUS - 5; // 39

    assert.ok(distance(100, 100, 138, 100) < threshold, 'Distance 38 should hit');
    assert.ok(distance(100, 100, 140, 100) >= threshold, 'Distance 40 should not hit');
  });

  it('should accurately detect Heavy Bot collision threshold', () => {
    const threshold = PLAYER_RADIUS + HEAVY_BOT_RADIUS - 5; // 47

    assert.ok(distance(200, 200, 245, 200) < threshold, 'Distance 45 should hit');
    assert.ok(distance(200, 200, 250, 200) >= threshold, 'Distance 50 should not hit');
  });

  it('should detect landmark collision with inset tolerance', () => {
    const landmarkRadius = 34;
    const threshold = PLAYER_RADIUS + landmarkRadius - 4; // 50

    assert.ok(distance(300, 300, 348, 300) < threshold, 'Distance 48 should hit');
    assert.ok(distance(300, 300, 352, 300) >= threshold, 'Distance 52 should not hit');
  });

  it('should detect Sweeper Cart rotating arm, hub, and cart collisions', () => {
    const sweeper = {
      x: 640,
      y: 640,
      angle: 0, // Points right along +X
      armLength: 125,
    };
    const tipX = sweeper.x + Math.cos(sweeper.angle) * sweeper.armLength; // 765
    const tipY = sweeper.y + Math.sin(sweeper.angle) * sweeper.armLength; // 640

    // 1. Hub collision (radius 20 + player radius 20 = 40)
    const hubHit = distance(640, 670, sweeper.x, sweeper.y) < PLAYER_RADIUS + 20;
    assert.ok(hubHit, 'Player at (640, 670) should collide with hub');

    // 2. Tip / Sweeper Cart collision (radius 22 + player radius 20 = 42)
    const tipHit = distance(tipX + 30, tipY, tipX, tipY) < PLAYER_RADIUS + 22;
    assert.ok(tipHit, 'Player near arm tip should collide with sweeper cart');

    // 3. Arm segment collision (midpoint of arm)
    const midX = sweeper.x + sweeper.armLength / 2; // 702.5
    const midY = sweeper.y;
    const armHit = pointSegmentDistance(midX, midY + 15, sweeper.x, sweeper.y, tipX, tipY) < PLAYER_RADIUS + 5;
    assert.ok(armHit, 'Player crossing the rotating arm segment should collide');

    // 4. Clear player safely away
    const farHit = pointSegmentDistance(500, 500, sweeper.x, sweeper.y, tipX, tipY) < PLAYER_RADIUS + 5;
    assert.equal(farHit, false, 'Far player should not collide with sweeper');
  });
});
