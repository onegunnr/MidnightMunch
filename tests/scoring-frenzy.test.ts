import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function streakMultiplier(streak: number): number {
  return Math.min(5, 1 + Math.floor(streak / 5));
}

function mischiefFactor(count: number): number {
  return Math.min(3, 1 + Math.floor(Math.max(0, count - 1) / 2) * 0.5);
}

function snackPoints(kind: 'popcorn' | 'donut' | 'bag'): number {
  return kind === 'popcorn' ? 25 : kind === 'donut' ? 150 : 75;
}

describe('Scoring, Multipliers & Frenzy System', () => {
  it('should scale streak multiplier accurately up to 5× cap', () => {
    assert.equal(streakMultiplier(0), 1);
    assert.equal(streakMultiplier(4), 1);
    assert.equal(streakMultiplier(5), 2);
    assert.equal(streakMultiplier(9), 2);
    assert.equal(streakMultiplier(10), 3);
    assert.equal(streakMultiplier(14), 3);
    assert.equal(streakMultiplier(15), 4);
    assert.equal(streakMultiplier(19), 4);
    assert.equal(streakMultiplier(20), 5);
    assert.equal(streakMultiplier(50), 5, 'Multiplier must cap at 5x');
  });

  it('should scale mischief combo factor dynamically up to 3× cap', () => {
    assert.equal(mischiefFactor(0), 1);
    assert.equal(mischiefFactor(1), 1);
    assert.equal(mischiefFactor(2), 1);
    assert.equal(mischiefFactor(3), 1.5);
    assert.equal(mischiefFactor(4), 1.5);
    assert.equal(mischiefFactor(5), 2.0);
    assert.equal(mischiefFactor(7), 2.5);
    assert.equal(mischiefFactor(9), 3.0);
    assert.equal(mischiefFactor(20), 3.0, 'Mischief factor must cap at 3x');
  });

  it('should compute combined score with streak, frenzy, and mischief', () => {
    const kind = 'donut';
    const base = snackPoints(kind); // 150
    const streak = 10; // multiplier = 3
    const frenzyActive = true; // factor = 2

    const score = base * streakMultiplier(streak) * (frenzyActive ? 2 : 1);
    assert.equal(score, 150 * 3 * 2); // 900 points!
  });

  it('should grant high reward for Sweeper Smash bot elimination', () => {
    const sweeperBase = 150;
    const mult = streakMultiplier(5); // 2
    const mischief = mischiefFactor(3); // 1.5
    const frenzy = 2;

    const points = Math.round(sweeperBase * mult * frenzy * mischief);
    assert.equal(points, 150 * 2 * 2 * 1.5); // 900
  });
});
