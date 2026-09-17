import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager } from '../src/save/SaveManager';
import { YouTubePlatformAdapter } from '../src/platform/PlatformAdapter';
import type { PlatformAdapter } from '../src/platform/PlatformAdapter';

// In-memory localStorage mock for Node environment
function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    _raw: store,
  };
}

describe('SaveManager & Cloud Sync', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  it('should initialize with blank defaults when no local or cloud data exists', () => {
    const save = new SaveManager();
    const data = save.load();
    assert.equal(data.version, 1);
    assert.equal(data.gameId, 'midnight-munch');
    assert.equal(data.bestScore, 0);
    assert.equal(data.bestSnackStreak, 0);
    assert.equal(data.longestRunSeconds, 0);
    assert.equal(data.totalRuns, 0);
    assert.deepEqual(data.achievements, []);
  });

  it('should immediately load cached data from localStorage on frame 0', () => {
    mockStorage.setItem(
      'midnight-munch-save-v1',
      JSON.stringify({
        version: 1,
        gameId: 'midnight-munch',
        bestScore: 1540,
        bestSnackStreak: 12,
        longestRunSeconds: 45,
        totalRuns: 3,
        achievements: ['OUTSMARTER'],
      })
    );

    const save = new SaveManager();
    const data = save.load();
    assert.equal(data.bestScore, 1540);
    assert.equal(data.bestSnackStreak, 12);
    assert.equal(data.longestRunSeconds, 45);
    assert.equal(data.totalRuns, 3);
    assert.deepEqual(data.achievements, ['OUTSMARTER']);
  });

  it('should merge cloud data non-destructively (Math.max and Set union)', async () => {
    // Local has 800 score and OUTSMARTER
    mockStorage.setItem(
      'midnight-munch-save-v1',
      JSON.stringify({
        version: 1,
        gameId: 'midnight-munch',
        bestScore: 800,
        bestSnackStreak: 8,
        longestRunSeconds: 30,
        totalRuns: 5,
        achievements: ['OUTSMARTER'],
      })
    );

    // Cloud has 1200 score, fewer runs, and GOLDEN DONUT
    const mockPlatform: PlatformAdapter = {
      firstFrameReady: () => {},
      gameReady: () => {},
      isAudioEnabled: () => true,
      onAudioChanged: () => {},
      onPause: () => {},
      onResume: () => {},
      isCloudStorageAvailable: () => true,
      loadData: async () =>
        JSON.stringify({
          version: 1,
          gameId: 'midnight-munch',
          bestScore: 1200,
          bestSnackStreak: 15,
          longestRunSeconds: 52,
          totalRuns: 2,
          achievements: ['GOLDEN DONUT'],
        }),
      saveData: async () => {},
    };

    let updatedFromCloud = false;
    const save = new SaveManager(mockPlatform, () => {
      updatedFromCloud = true;
    });

    // Await cloud sync
    const merged = await save.loadCloud();

    assert.equal(merged.bestScore, 1200, 'Score should take higher cloud score');
    assert.equal(merged.bestSnackStreak, 15, 'Streak should take higher cloud streak');
    assert.equal(merged.longestRunSeconds, 52, 'Longest run should take higher cloud time');
    assert.equal(merged.totalRuns, 5, 'Total runs should take highest count');
    assert.ok(merged.achievements.includes('OUTSMARTER'), 'Local achievement must be preserved');
    assert.ok(merged.achievements.includes('GOLDEN DONUT'), 'Cloud achievement must be merged');
    assert.equal(merged.achievements.length, 2);
    assert.ok(updatedFromCloud, 'onDataUpdated callback must fire when cloud data merges');
  });

  it('should gracefully handle malformed or corrupted cloud payloads without crashing', async () => {
    const mockPlatform: PlatformAdapter = {
      firstFrameReady: () => {},
      gameReady: () => {},
      isAudioEnabled: () => true,
      onAudioChanged: () => {},
      onPause: () => {},
      onResume: () => {},
      isCloudStorageAvailable: () => true,
      loadData: async () => 'INVALID_JSON{{{---',
      saveData: async () => {},
    };

    const save = new SaveManager(mockPlatform);
    const data = await save.loadCloud();
    assert.equal(data.bestScore, 0);
    assert.deepEqual(data.achievements, []);
  });

  it('should sanitize negative or non-finite numbers', () => {
    mockStorage.setItem(
      'midnight-munch-save-v1',
      JSON.stringify({
        version: 1,
        bestScore: -500,
        bestSnackStreak: NaN,
        longestRunSeconds: Infinity,
        totalRuns: 'invalid',
        achievements: [123, null, 'VALID_STUNT'],
      })
    );

    const save = new SaveManager();
    const data = save.load();
    assert.equal(data.bestScore, 0);
    assert.equal(data.bestSnackStreak, 0);
    assert.equal(data.longestRunSeconds, 0);
    assert.equal(data.totalRuns, 0);
    assert.deepEqual(data.achievements, ['VALID_STUNT']);
  });

  it('should record runs, update records, and persist to local and cloud', async () => {
    const savedPayloads: string[] = [];
    const mockPlatform: PlatformAdapter = {
      firstFrameReady: () => {},
      gameReady: () => {},
      isAudioEnabled: () => true,
      onAudioChanged: () => {},
      onPause: () => {},
      onResume: () => {},
      isCloudStorageAvailable: () => true,
      loadData: async () => null,
      saveData: async (payload: string) => {
        savedPayloads.push(payload);
      },
    };

    const save = new SaveManager(mockPlatform);
    const result1 = save.record(500, 7, 28.4, ['SNACK MASTER'], false);

    assert.equal(result1.best, true);
    assert.equal(result1.achievement, 'SNACK MASTER');
    assert.equal(save.data.bestScore, 500);
    assert.equal(save.data.bestSnackStreak, 7);
    assert.equal(save.data.longestRunSeconds, 28);
    assert.equal(save.data.totalRuns, 1);

    // Give microtask/async flush a moment
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(savedPayloads.length >= 1, 'Cloud save should have been dispatched');

    // Second run with lower score should not flag best
    const result2 = save.record(300, 4, 15.0, [], false);
    assert.equal(result2.best, false);
    assert.equal(save.data.bestScore, 500);
    assert.equal(save.data.totalRuns, 2);
  });

  it('should ignore practice mode runs', () => {
    const save = new SaveManager();
    const result = save.record(9999, 50, 120, ['MIDNIGHT SURVIVOR'], true);
    assert.equal(result.best, false);
    assert.equal(save.data.bestScore, 0);
    assert.equal(save.data.totalRuns, 0);
    assert.deepEqual(save.data.achievements, []);
  });
});

describe('YouTubePlatformAdapter Standalone vs Playables', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  it('should fall back to localStorage in standalone browser (no window.ytgame)', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });

    const adapter = new YouTubePlatformAdapter();
    assert.equal(adapter.isCloudStorageAvailable(), false);
    assert.equal(adapter.isAudioEnabled(), true);

    await adapter.saveData(JSON.stringify({ score: 99 }));
    const loaded = await adapter.loadData();
    assert.equal(loaded, JSON.stringify({ score: 99 }));
  });

  it('should use window.ytgame.storage when running inside YouTube Playables', async () => {
    let cloudStore = '';
    let cloudSaved = false;

    Object.defineProperty(globalThis, 'window', {
      value: {
        ytgame: {
          storage: {
            loadData: async () => '{"cloud": true}',
            saveData: async (data: string) => {
              cloudStore = data;
              cloudSaved = true;
            },
          },
          system: {
            isAudioEnabled: () => false,
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const adapter = new YouTubePlatformAdapter();
    assert.equal(adapter.isCloudStorageAvailable(), true);
    assert.equal(adapter.isAudioEnabled(), false);

    const loaded = await adapter.loadData();
    assert.equal(loaded, '{"cloud": true}');

    await adapter.saveData('{"cloud": "updated"}');
    assert.equal(cloudSaved, true);
    assert.equal(cloudStore, '{"cloud": "updated"}');
  });

  it('should send score to ytgame.engagement.sendScore when available', () => {
    let sentScore: number | null = null;
    Object.defineProperty(globalThis, 'window', {
      value: {
        ytgame: {
          engagement: {
            sendScore: (scoreObj: { value: number }) => {
              sentScore = scoreObj.value;
            },
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const adapter = new YouTubePlatformAdapter();
    adapter.sendScore(1450);
    assert.equal(sentScore, 1450);
  });
});
