export type GameState = "MENU" | "PLAYING" | "GAME_OVER";

export interface PlayerCart {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  heading: number;
  turnDirection: 1 | -1;
  speed: number;
  radius: number;
  lean: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface SecurityBot {
  id: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  heading: number;
  speed: number;
  turnRate: number;
  radius: number;
  kind: "scooter" | "heavy";
  state: "warning" | "active" | "disabled";
  warning: number;
  disabled: number;
}

export interface Landmark {
  x: number;
  y: number;
  radius: number;
  kind: "booth" | "planter" | "truck";
}

export interface CarouselEvent {
  x: number;
  y: number;
  angle: number;
  remaining: number;
  armLength: number;
  phase: "warning" | "active";
  warning: number;
}

export type SnackKind = "popcorn" | "donut" | "bag";

export interface Snack {
  id: number;
  x: number;
  y: number;
  radius: number;
  kind: SnackKind;
  collected: boolean;
}

export type PowerUpKind = "sugar_rush" | "magnet";

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  radius: number;
  kind: PowerUpKind;
  collected: boolean;
  life: number;
  maxLife: number;
}

export interface Encounter {
  botId: number;
  inside: boolean;
  minDistance: number;
  cooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
}

export interface Shockwave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
}

export interface MidnightMunchSave {
  version: 1;
  gameId: "midnight-munch";
  bestScore: number;
  bestSnackStreak: number;
  longestRunSeconds: number;
  totalRuns: number;
  achievements: string[];
}
