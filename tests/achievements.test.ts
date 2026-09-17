import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS_LIST } from '../src/core/achievements';

describe('Achievements Registry', () => {
  it('should define exactly 6 achievements', () => {
    assert.equal(ACHIEVEMENTS_LIST.length, 6);
  });

  it('should have unique non-empty IDs for all achievements', () => {
    const ids = new Set<string>();
    for (const ach of ACHIEVEMENTS_LIST) {
      assert.ok(ach.id && typeof ach.id === 'string', `Achievement ID should be non-empty string`);
      assert.ok(!ids.has(ach.id), `Duplicate achievement ID found: ${ach.id}`);
      ids.add(ach.id);
    }
  });

  it('should have non-empty names, icons, and descriptions', () => {
    for (const ach of ACHIEVEMENTS_LIST) {
      assert.ok(ach.name && ach.name.trim().length > 0, `Achievement ${ach.id} must have a name`);
      assert.ok(ach.icon && ach.icon.trim().length > 0, `Achievement ${ach.id} must have an icon`);
      assert.ok(ach.desc && ach.desc.trim().length > 0, `Achievement ${ach.id} must have a description`);
    }
  });

  it('should include all required core stunts', () => {
    const expectedIds = [
      'FIVE CLOSE CALLS',
      'OUTSMARTER',
      'SNACK MASTER',
      'GOLDEN DONUT',
      'SNACK FRENZY',
      'MIDNIGHT SURVIVOR',
    ];
    const registeredIds = ACHIEVEMENTS_LIST.map((a) => a.id);
    for (const expected of expectedIds) {
      assert.ok(registeredIds.includes(expected), `Missing required achievement: ${expected}`);
    }
  });
});
