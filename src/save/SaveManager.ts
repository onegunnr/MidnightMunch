import type { MidnightMunchSave } from "../core/types";
import type { PlatformAdapter } from "../platform/PlatformAdapter";

const KEY = "midnight-munch-save-v1";
const blank = (): MidnightMunchSave => ({
  version: 1,
  gameId: "midnight-munch",
  bestScore: 0,
  bestSnackStreak: 0,
  longestRunSeconds: 0,
  totalRuns: 0,
  achievements: [],
});

export class SaveManager {
  data: MidnightMunchSave = blank();
  private pendingSave: string | null = null;
  private isSaving = false;

  constructor(
    private readonly platform?: PlatformAdapter,
    private readonly onDataUpdated?: (data: MidnightMunchSave) => void
  ) {
    // 1. Immediate local load so menus and stats are ready on frame 0
    this.loadLocal();
    // 2. Await cloud data asynchronously and merge without race conditions
    void this.loadCloud();
  }

  private loadLocal(): MidnightMunchSave {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.data = this.parseAndValidate(raw, this.data);
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
    return this.data;
  }

  async loadCloud(): Promise<MidnightMunchSave> {
    if (!this.platform) return this.data;
    try {
      const raw = await this.platform.loadData();
      if (raw) {
        const cloudData = this.parseAndValidate(raw, blank());
        // Merge cloud data with any progress made before cloud load resolved
        this.data = this.mergeSaves(this.data, cloudData);
        this.persistLocal();
        this.onDataUpdated?.(this.data);
      }
    } catch (err) {
      console.warn("[SaveManager] Error loading cloud data:", err);
    }
    return this.data;
  }

  load(): MidnightMunchSave {
    return this.data;
  }

  record(
    score: number,
    streak: number,
    seconds: number,
    newAchievements: string[],
    practice: boolean
  ): { best: boolean; achievement?: string } {
    if (practice) return { best: false };

    const best = score > this.data.bestScore;
    this.data.bestScore = Math.max(this.data.bestScore, score);
    this.data.bestSnackStreak = Math.max(this.data.bestSnackStreak, streak);
    this.data.longestRunSeconds = Math.max(this.data.longestRunSeconds, Math.floor(seconds));
    this.data.totalRuns++;

    const achievement = newAchievements.find((item) => !this.data.achievements.includes(item));
    for (const item of newAchievements) {
      if (!this.data.achievements.includes(item)) {
        this.data.achievements.push(item);
      }
    }

    this.persistLocal();
    this.queueCloudSave();

    return { best, achievement };
  }

  private persistLocal(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Storage unavailable
    }
  }

  private queueCloudSave(): void {
    if (!this.platform) return;
    this.pendingSave = JSON.stringify(this.data);
    if (!this.isSaving) {
      void this.flushCloudSave();
    }
  }

  private async flushCloudSave(): Promise<void> {
    if (!this.platform || !this.pendingSave) return;
    this.isSaving = true;
    while (this.pendingSave) {
      const dataToSave = this.pendingSave;
      this.pendingSave = null;
      try {
        await this.platform.saveData(dataToSave);
      } catch (err) {
        console.warn("[SaveManager] Cloud saveData error:", err);
      }
    }
    this.isSaving = false;
  }

  private parseAndValidate(raw: string, fallback: MidnightMunchSave): MidnightMunchSave {
    try {
      const input = JSON.parse(raw) as Partial<MidnightMunchSave>;
      if (!input || typeof input !== "object") return fallback;
      return {
        version: 1,
        gameId: "midnight-munch",
        bestScore: finite(input.bestScore),
        bestSnackStreak: finite(input.bestSnackStreak),
        longestRunSeconds: finite(input.longestRunSeconds),
        totalRuns: finite(input.totalRuns),
        achievements: Array.isArray(input.achievements)
          ? input.achievements.filter((x): x is string => typeof x === "string")
          : [],
      };
    } catch {
      return fallback;
    }
  }

  private mergeSaves(current: MidnightMunchSave, cloud: MidnightMunchSave): MidnightMunchSave {
    const achievementsSet = new Set([...current.achievements, ...cloud.achievements]);
    return {
      version: 1,
      gameId: "midnight-munch",
      bestScore: Math.max(current.bestScore, cloud.bestScore),
      bestSnackStreak: Math.max(current.bestSnackStreak, cloud.bestSnackStreak),
      longestRunSeconds: Math.max(current.longestRunSeconds, cloud.longestRunSeconds),
      totalRuns: Math.max(current.totalRuns, cloud.totalRuns),
      achievements: Array.from(achievementsSet),
    };
  }
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
