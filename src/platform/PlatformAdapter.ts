/**
 * The game never imports the hosting SDK directly.
 * This boundary isolates official YouTube Playables SDK calls while providing
 * a robust local storage fallback when running standalone in standard web browsers.
 */
export interface PlatformAdapter {
  firstFrameReady(): void;
  gameReady(): void;
  isAudioEnabled(): boolean;
  onAudioChanged(listener: (enabled: boolean) => void): void;
  onPause(listener: () => void): void;
  onResume(listener: () => void): void;
  loadData(): Promise<string | null>;
  saveData(data: string): Promise<void>;
  isCloudStorageAvailable(): boolean;
  sendScore?(score: number): void;
}

type YtGame = {
  game?: {
    firstFrameReady?: () => void;
    gameReady?: () => void;
    onPause?: (fn: () => void) => void;
    onResume?: (fn: () => void) => void;
  };
  system?: {
    isAudioEnabled?: () => boolean;
    onAudioEnabledChange?: (fn: (enabled: boolean) => void) => void;
    onPause?: (fn: () => void) => void;
    onResume?: (fn: () => void) => void;
  };
  storage?: {
    loadData?: () => Promise<string>;
    saveData?: (data: string) => Promise<void>;
  };
  engagement?: {
    sendScore?: (score: { value: number }) => Promise<void> | void;
  };
};

declare global {
  interface Window {
    ytgame?: YtGame;
  }
}

const STORAGE_KEY = "midnight-munch-save-v1";

export class YouTubePlatformAdapter implements PlatformAdapter {
  private get sdk(): YtGame | undefined {
    return window.ytgame;
  }

  firstFrameReady(): void {
    this.sdk?.game?.firstFrameReady?.();
  }

  gameReady(): void {
    this.sdk?.game?.gameReady?.();
  }

  isAudioEnabled(): boolean {
    return this.sdk?.system?.isAudioEnabled?.() ?? true;
  }

  onAudioChanged(listener: (enabled: boolean) => void): void {
    this.sdk?.system?.onAudioEnabledChange?.(listener);
  }

  onPause(listener: () => void): void {
    this.sdk?.game?.onPause?.(listener);
    this.sdk?.system?.onPause?.(listener);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) listener();
      });
    }
  }

  onResume(listener: () => void): void {
    this.sdk?.game?.onResume?.(listener);
    this.sdk?.system?.onResume?.(listener);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) listener();
      });
    }
  }

  sendScore(score: number): void {
    if (typeof this.sdk?.engagement?.sendScore === "function") {
      try {
        void this.sdk.engagement.sendScore({ value: Math.floor(score) });
      } catch (err) {
        console.warn("[YouTubePlatformAdapter] sendScore failed:", err);
      }
    }
  }

  isCloudStorageAvailable(): boolean {
    return (
      typeof this.sdk?.storage?.loadData === "function" &&
      typeof this.sdk?.storage?.saveData === "function"
    );
  }

  async loadData(): Promise<string | null> {
    if (this.isCloudStorageAvailable()) {
      try {
        const cloudData = await this.sdk!.storage!.loadData!();
        return cloudData || null;
      } catch (err) {
        console.warn("[YouTubePlatformAdapter] Cloud loadData failed, falling back to local cache:", err);
      }
    }
    // Standalone fallback
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  async saveData(data: string): Promise<void> {
    if (this.isCloudStorageAvailable()) {
      try {
        await this.sdk!.storage!.saveData!(data);
        return;
      } catch (err) {
        console.warn("[YouTubePlatformAdapter] Cloud saveData failed:", err);
      }
    }
    // Standalone fallback / local cache
    try {
      localStorage.setItem(STORAGE_KEY, data);
    } catch {
      // Storage quota or restriction
    }
  }
}
