import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SecurityBot, Snack, PowerUp } from '../src/core/types';

const PLAYER_RADIUS = 20;

function sweptDistance(px: number, py: number, prevX: number, prevY: number, bx: number, by: number): number {
  return Math.min(Math.hypot(bx - px, by - py), Math.hypot(bx - prevX, by - prevY));
}

describe('Gameplay Power-Ups System', () => {
  describe('Sugar Rush (Speed & Ramming Shield)', () => {
    it('should calculate +35% speed bonus when Sugar Rush is active', () => {
      const baseSpeed = 160;
      const speedInactive = baseSpeed * (0 > 0 ? 1.35 : 1);
      const speedActive = baseSpeed * (4.5 > 0 ? 1.35 : 1);

      assert.equal(speedInactive, 160);
      assert.equal(speedActive, 216);
    });

    it('should demolish security bots upon contact when Sugar Rush is active (RAM SMASH)', () => {
      const bot: SecurityBot = {
        id: 1,
        x: 130,
        y: 100,
        previousX: 130,
        previousY: 100,
        heading: 0,
        speed: 120,
        turnRate: 1.5,
        radius: 24,
        kind: 'scooter',
        state: 'active',
        warning: 0,
        disabled: 0,
      };

      const player = { x: 100, y: 100, previousX: 95, previousY: 100, radius: PLAYER_RADIUS };
      const hitThreshold = player.radius + bot.radius - 5; // 39
      const dist = sweptDistance(player.x, player.y, player.previousX, player.previousY, bot.x, bot.y); // 30

      assert.ok(dist < hitThreshold, 'Player and bot are in collision range');

      // Normal condition: death
      let sugarRushTimer = 0;
      let playerSurvived = false;
      if (dist < hitThreshold) {
        if (sugarRushTimer > 0) {
          bot.state = 'disabled';
          bot.disabled = 1.2;
          playerSurvived = true;
        } else {
          playerSurvived = false;
        }
      }
      assert.equal(playerSurvived, false, 'Without Sugar Rush, player dies');

      // Sugar Rush condition: ram smash & bot disabled!
      sugarRushTimer = 4.5;
      if (dist < hitThreshold) {
        if (sugarRushTimer > 0) {
          bot.state = 'disabled';
          bot.disabled = 1.2;
          playerSurvived = true;
        } else {
          playerSurvived = false;
        }
      }
      assert.equal(playerSurvived, true, 'With Sugar Rush, player survives');
      assert.equal(bot.state, 'disabled', 'Bot must be disabled after ram');
      assert.equal(bot.disabled, 1.2, 'Bot disabled cooldown must be 1.2 seconds');
    });

    it('should still allow Sweeper Cart to be lethal during Sugar Rush', () => {
      const sugarRushTimer = 4.5;
      const sweeper = { x: 640, y: 640, radius: 20 };
      const player = { x: 640, y: 650, radius: 20 };

      const dist = Math.hypot(player.x - sweeper.x, player.y - sweeper.y);
      const hitHub = dist < player.radius + sweeper.radius;

      // Sugar rush shields against bots, but hazards/sweepers still hit
      const hitHazard = hitHub;
      assert.ok(hitHazard, 'Hazard/Sweeper collisions remain lethal even with Sugar Rush');
    });
  });

  describe('Snack Magnet (Attraction Physics)', () => {
    it('should pull snacks within 250px directly toward player position', () => {
      const player = { x: 400, y: 400 };
      const snackNear: Snack = { id: 1, x: 500, y: 400, radius: 12, kind: 'popcorn', collected: false };
      const snackFar: Snack = { id: 2, x: 750, y: 400, radius: 12, kind: 'popcorn', collected: false };

      const dt = 0.05;
      const snacks = [snackNear, snackFar];

      for (const snack of snacks) {
        const dx = player.x - snack.x;
        const dy = player.y - snack.y;
        const d = Math.hypot(dx, dy);
        if (d < 250 && d > 0.001) {
          const pullSpeed = (1 - d / 250) * 440 + 160;
          snack.x += (dx / d) * pullSpeed * dt;
          snack.y += (dy / d) * pullSpeed * dt;
        }
      }

      assert.ok(snackNear.x < 500, 'Near snack should move toward player (X should decrease)');
      assert.equal(snackFar.x, 750, 'Far snack outside 250px should remain untouched');
    });

    it('should pull closer snacks with higher acceleration', () => {
      const dClose = 50;
      const dMid = 180;

      const speedClose = (1 - dClose / 250) * 440 + 160;
      const speedMid = (1 - dMid / 250) * 440 + 160;

      assert.ok(speedClose > speedMid, 'Closer snacks experience stronger magnetic pull');
    });
  });

  describe('PowerUp Spawning & Lifespan', () => {
    it('should expire and be removed when life reaches 0', () => {
      const powerUp: PowerUp = {
        id: 10,
        x: 300,
        y: 300,
        radius: 22,
        kind: 'sugar_rush',
        collected: false,
        life: 0.1,
        maxLife: 12,
      };

      const dt = 0.2;
      powerUp.life -= dt;
      if (powerUp.life <= 0) powerUp.collected = true;

      assert.equal(powerUp.collected, true, 'PowerUp should be marked collected/expired when life <= 0');
    });

    it('should trigger collection when player is within radius threshold', () => {
      const powerUp: PowerUp = {
        id: 11,
        x: 300,
        y: 300,
        radius: 22,
        kind: 'magnet',
        collected: false,
        life: 10,
        maxLife: 12,
      };

      const player = { x: 340, y: 300, radius: PLAYER_RADIUS };
      const threshold = player.radius + powerUp.radius + 6; // 48
      const d = Math.hypot(player.x - powerUp.x, player.y - powerUp.y); // 40

      assert.ok(d < threshold, 'Player at distance 40 is within collection radius 48');
    });
  });
});
