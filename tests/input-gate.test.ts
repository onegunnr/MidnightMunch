import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../src/core/InputManager';

describe('InputManager & Modal Gating', () => {
  let keyListeners: Array<(e: any) => void>;

  beforeEach(() => {
    keyListeners = [];
    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: (event: string, fn: (e: any) => void) => {
          if (event === 'keydown') keyListeners.push(fn);
        },
      },
      configurable: true,
      writable: true,
    });
  });

  it('should trigger action on normal Spacebar press', () => {
    let fired = 0;
    const input = new InputManager(() => {
      fired++;
    });

    let defaultPrevented = false;
    const event = {
      code: 'Space',
      repeat: false,
      preventDefault: () => {
        defaultPrevented = true;
      },
    };

    keyListeners[0](event);
    assert.equal(fired, 1);
    assert.equal(defaultPrevented, true);
  });

  it('should ignore repeated Spacebar events (holding down key)', () => {
    let fired = 0;
    new InputManager(() => {
      fired++;
    });

    const event = { code: 'Space', repeat: true, preventDefault: () => {} };
    keyListeners[0](event);
    assert.equal(fired, 0);
  });

  it('should ignore non-Space keys (e.g. Enter, ArrowUp)', () => {
    let fired = 0;
    new InputManager(() => {
      fired++;
    });

    keyListeners[0]({ code: 'Enter', repeat: false, preventDefault: () => {} });
    keyListeners[0]({ code: 'KeyA', repeat: false, preventDefault: () => {} });
    assert.equal(fired, 0);
  });

  it('CRITICAL: should suppress Spacebar when isBlocked() returns true (e.g. modal open)', () => {
    let isModalOpen = true;
    let fired = 0;

    new InputManager(
      () => {
        fired++;
      },
      () => isModalOpen
    );

    // Press while modal is open
    keyListeners[0]({ code: 'Space', repeat: false, preventDefault: () => {} });
    assert.equal(fired, 0, 'Spacebar must be suppressed while modal is open');

    // Close modal
    isModalOpen = false;
    keyListeners[0]({ code: 'Space', repeat: false, preventDefault: () => {} });
    assert.equal(fired, 1, 'Spacebar must work once modal closes');
  });

  it('should suppress pointer events when isBlocked() returns true', () => {
    let isBlocked = true;
    let fired = 0;

    const input = new InputManager(
      () => {
        fired++;
      },
      () => isBlocked
    );

    let pointerListener: ((e: any) => void) | null = null;
    const mockTarget = {
      addEventListener: (_ev: string, fn: any) => {
        pointerListener = fn;
      },
    } as any;

    input.bind(mockTarget);
    assert.ok(pointerListener !== null);

    // Pointer click while blocked
    pointerListener!({
      target: { closest: () => null },
      preventDefault: () => {},
    });
    assert.equal(fired, 0);

    // Unblock
    isBlocked = false;
    pointerListener!({
      target: { closest: () => null },
      preventDefault: () => {},
    });
    assert.equal(fired, 1);
  });

  it('should ignore pointer clicks inside buttons, dialogs, or trophy screen', () => {
    let fired = 0;
    const input = new InputManager(() => {
      fired++;
    });

    let pointerListener: ((e: any) => void) | null = null;
    const mockTarget = {
      addEventListener: (_ev: string, fn: any) => {
        pointerListener = fn;
      },
    } as any;

    input.bind(mockTarget);

    // Click on a button
    pointerListener!({
      target: { closest: (sel: string) => (sel.includes('button') ? {} : null) },
      preventDefault: () => {},
    });
    assert.equal(fired, 0);

    // Click inside modal dialog
    pointerListener!({
      target: { closest: (sel: string) => (sel.includes('#trophies-screen') ? {} : null) },
      preventDefault: () => {},
    });
    assert.equal(fired, 0);
  });

  it('should debounce rapid synchronous triggers via microtask', async () => {
    let fired = 0;
    new InputManager(() => {
      fired++;
    });

    const event = { code: 'Space', repeat: false, preventDefault: () => {} };
    keyListeners[0](event);
    keyListeners[0](event); // Synchronous second tap before microtask resolves

    assert.equal(fired, 1, 'Synchronous multi-trigger should be debounced to 1');

    // Wait for microtask
    await Promise.resolve();
    keyListeners[0](event);
    assert.equal(fired, 2, 'Subsequent trigger after microtask should fire');
  });
});
