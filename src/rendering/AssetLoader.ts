export type AssetKey =
  | "rascalCart"
  | "securityBot"
  | "heavySecurityCart"
  | "popcorn"
  | "donut"
  | "snackBag"
  | "hazardCone"
  | "snackBooth"
  | "snackTruck"
  | "planterIsland"
  | "carouselHub"
  | "carouselSweeper"
  | "parkingLot"
  | "parkBackdrop";

const BASE = (import.meta.env.BASE_URL ?? "./").replace(/\/$/, "") + "/assets/";

const ASSET_PATHS: Record<AssetKey, string> = {
  rascalCart: `${BASE}characters/rascal_cart_topdown.svg`,
  securityBot: `${BASE}characters/security_bot_topdown.svg`,
  heavySecurityCart: `${BASE}characters/heavy_security_cart_topdown.svg`,
  popcorn: `${BASE}collectibles/snack_popcorn.svg`,
  donut: `${BASE}collectibles/snack_golden_donut.svg`,
  snackBag: `${BASE}collectibles/snack_bag.svg`,
  hazardCone: `${BASE}arena/hazard_cone.svg`,
  snackBooth: `${BASE}arena/snack_booth.svg`,
  snackTruck: `${BASE}arena/parked_snack_truck.svg`,
  planterIsland: `${BASE}arena/planter_island.svg`,
  carouselHub: `${BASE}arena/carousel_hub.svg`,
  carouselSweeper: `${BASE}arena/carousel_sweeper_cart.svg`,
  parkingLot: `${BASE}arena/parking_lot_tile.svg`,
  parkBackdrop: `${BASE}arena/park_backdrop.svg`,
};

export class AssetLoader {
  private images = new Map<AssetKey, HTMLImageElement>();
  private loadedCount = 0;
  private totalCount = Object.keys(ASSET_PATHS).length;

  constructor() {
    this.preload();
  }

  private preload(): void {
    for (const [key, path] of Object.entries(ASSET_PATHS) as [AssetKey, string][]) {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        this.loadedCount++;
        this.images.set(key, img);
      };
      img.onerror = () => {
        console.warn(`Failed to load asset: ${path}`);
      };
    }
  }

  get(key: AssetKey): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  isReady(key: AssetKey): boolean {
    const img = this.images.get(key);
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  get progress(): number {
    return this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
  }
}
