import type { CarouselEvent, FloatingText, Landmark, Particle, PlayerCart, PowerUp, SecurityBot, Shockwave, SkidMark, Snack } from "../core/types";
import { AssetLoader } from "./AssetLoader";

const ARENA = 900;

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  shake = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private designWidth = 1280;
  private designHeight = 720;
  private arenaX = 300;
  private arenaY = 20;
  private arenaSize = 680;
  private readonly assets = new AssetLoader();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    this.ctx = ctx;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize(): void {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * dpr));
    this.canvas.height = Math.max(1, Math.round(box.height * dpr));
    const portrait = this.canvas.height > this.canvas.width * 1.08;
    this.designWidth = portrait ? 720 : 1280;
    this.designHeight = portrait ? 1280 : 720;
    this.arenaSize = portrait ? 680 : 680;
    this.arenaX = portrait ? 20 : 300;
    this.arenaY = portrait ? 300 : 20;
    this.scale = Math.min(this.canvas.width / this.designWidth, this.canvas.height / this.designHeight);
    this.offsetX = (this.canvas.width - this.designWidth * this.scale) / 2;
    this.offsetY = (this.canvas.height - this.designHeight * this.scale) / 2;
  }

  frame(
    time: number,
    player: PlayerCart,
    bots: SecurityBot[],
    snacks: Snack[],
    particles: Particle[],
    landmarks: Landmark[] = [],
    carousel: CarouselEvent | null = null,
    elapsed: number = 0,
    streakTimer: number = 0,
    gameState: string = "PLAYING",
    skidMarks: SkidMark[] = [],
    shockwaves: Shockwave[] = [],
    floatingTexts: FloatingText[] = [],
    frenzyTimer: number = 0,
    powerUps: PowerUp[] = [],
    sugarRushTimer: number = 0,
    magnetTimer: number = 0
  ): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.save();
    c.translate(this.offsetX, this.offsetY);
    c.scale(this.scale, this.scale);

    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    c.translate(shakeX, shakeY);
    this.shake *= 0.84;
    if (this.shake < 0.15) this.shake = 0;

    this.background(c, time, elapsed);
    this.arena(c);
    this.renderSkids(c, skidMarks);
    this.renderLandmarks(c, landmarks);
    this.renderCarousel(c, carousel, time);
    for (const snack of snacks) this.snack(c, snack, time);
    this.renderPowerUps(c, powerUps, time);
    for (const bot of bots) this.bot(c, bot, time);
    this.renderShockwaves(c, shockwaves);
    this.trail(c, player);
    if (magnetTimer > 0) {
      this.renderMagnetBeams(c, player, snacks, time);
    }
    this.rascal(c, player, time, frenzyTimer, sugarRushTimer, magnetTimer);
    this.streakBoost(c, player, streakTimer, time);
    for (const particle of particles) this.particle(c, particle);
    this.renderFloatingTexts(c, floatingTexts);
    if (gameState === "PLAYING") {
      this.directionHint(c, player, elapsed);
    }
    if (gameState === "MENU") {
      // Soft midnight atmospheric veil over the arena to let the menu card pop cleanly
      c.fillStyle = "rgba(15, 12, 42, 0.6)";
      c.fillRect(0, 0, this.designWidth, this.designHeight);
    }

    c.restore();
  }

  private background(c: CanvasRenderingContext2D, time: number, elapsed: number): void {
    if (this.assets.isReady("parkBackdrop")) {
      const backdrop = this.assets.get("parkBackdrop")!;
      const targetAspect = this.designWidth / this.designHeight;
      const sourceAspect = backdrop.naturalWidth / backdrop.naturalHeight;
      if (sourceAspect > targetAspect) {
        const sourceWidth = backdrop.naturalHeight * targetAspect;
        c.drawImage(backdrop, (backdrop.naturalWidth - sourceWidth) / 2, 0, sourceWidth, backdrop.naturalHeight, 0, 0, this.designWidth, this.designHeight);
      } else {
        const sourceHeight = backdrop.naturalWidth / targetAspect;
        c.drawImage(backdrop, 0, (backdrop.naturalHeight - sourceHeight) / 2, backdrop.naturalWidth, sourceHeight, 0, 0, this.designWidth, this.designHeight);
      }

      // Render Dynamic Animated Ferris Wheel
      this.renderAnimatedFerrisWheel(c, time);

      // Render Dynamic Animated Spinning Carousel (Merry-Go-Round)
      this.renderAnimatedCarousel(c, time);

      // Twinkling carnival bulb pulses across overhead garlands
      for (let i = 0; i < 16; i++) {
        const x = 40 + ((i * 80) % Math.max(80, this.designWidth - 60));
        const y = 110 + Math.sin(time * 0.003 + i * 0.8) * 14;
        c.fillStyle =
          i % 3 === 0
            ? "rgba(255, 94, 126, 0.75)"
            : i % 3 === 1
            ? "rgba(77, 232, 220, 0.75)"
            : "rgba(255, 218, 89, 0.75)";
        c.beginPath();
        c.arc(x, y, 4.5 + Math.sin(time * 0.006 + i) * 1.5, 0, Math.PI * 2);
        c.fill();
      }
      return;
    }

    const bg = c.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, "#171448");
    bg.addColorStop(1, "#372061");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.designWidth, this.designHeight);
  }

  private renderAnimatedFerrisWheel(c: CanvasRenderingContext2D, time: number): void {
    const isPortrait = this.canvas.height > this.canvas.width * 1.08;
    const wheelX = isPortrait ? this.designWidth - 140 : 1080;
    const wheelY = isPortrait ? 210 : 240;
    const radius = 138;
    const spokeCount = 12;
    const rotSpeed = 0.00035;
    const rot = time * rotSpeed;

    c.save();
    c.translate(wheelX, wheelY);

    // Outer Dual Neon Light Rings
    c.save();
    c.rotate(rot);

    // Outer Ring 1 (Neon Pink Glow)
    c.strokeStyle = "#e0538a";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.stroke();

    // Inner Concentric Ring (Cyan Neon)
    c.strokeStyle = "#4de8dc";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, radius - 16, 0, Math.PI * 2);
    c.stroke();

    // Truss Cross-Bracing between outer and inner rings
    c.strokeStyle = "rgba(255, 218, 89, 0.4)";
    c.lineWidth = 1.5;
    for (let i = 0; i < spokeCount * 2; i++) {
      const a1 = (i * Math.PI) / spokeCount;
      const a2 = ((i + 1) * Math.PI) / spokeCount;
      c.beginPath();
      c.moveTo(Math.cos(a1) * (radius - 16), Math.sin(a1) * (radius - 16));
      c.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
      c.stroke();
    }

    // Spokes radiating from center hub
    for (let i = 0; i < spokeCount; i++) {
      const a = (i * Math.PI * 2) / spokeCount;
      const cos = Math.cos(a);
      const sin = Math.sin(a);

      c.strokeStyle = "#ffd65a";
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(cos * radius, sin * radius);
      c.stroke();

      // Golden Running Bulbs along each spoke
      for (let step = 1; step <= 3; step++) {
        const d = (radius / 4) * step;
        const bulbPulsing = Math.sin(time * 0.008 + i * 2 + step) > 0;
        c.fillStyle = bulbPulsing ? "#ffffff" : "#ffbe26";
        c.beginPath();
        c.arc(cos * d, sin * d, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();

    // Gondolas / Passenger Cabins (Always stay upright due to gravity!)
    const cabColors = ["#ff4d6d", "#4de8dc", "#ffd65a", "#b06bff", "#ff7da7", "#38efdf"];
    for (let i = 0; i < spokeCount; i++) {
      const a = rot + (i * Math.PI * 2) / spokeCount;
      const gx = Math.cos(a) * radius;
      const gy = Math.sin(a) * radius;

      c.save();
      c.translate(gx, gy);
      // Gentle gravity pendulum swing
      c.rotate(Math.sin(time * 0.002 + i) * 0.08);

      // Pivot Pin
      c.fillStyle = "#ffd65a";
      c.beginPath();
      c.arc(0, 0, 3, 0, Math.PI * 2);
      c.fill();

      // Hanger Frame
      c.strokeStyle = "#5a3b94";
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-6, 9);
      c.lineTo(6, 9);
      c.closePath();
      c.stroke();

      // Gondola Carriage Box
      const color = cabColors[i % cabColors.length]!;
      c.fillStyle = color;
      round(c, -10, 9, 20, 15, 3.5);
      c.fill();
      c.strokeStyle = "#1b143b";
      c.lineWidth = 1.2;
      c.stroke();

      // Carriage Window
      c.fillStyle = "#ffffff";
      c.globalAlpha = 0.85;
      c.fillRect(-6, 12, 12, 6);
      c.globalAlpha = 1;

      // Carriage Roof Canopy
      c.fillStyle = "#ffcf47";
      round(c, -11, 8, 22, 3, 1.5);
      c.fill();

      c.restore();
    }

    // Center Axle Hub
    c.fillStyle = "#ffb82e";
    c.beginPath();
    c.arc(0, 0, 18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#4a1c6d";
    c.beginPath();
    c.arc(0, 0, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(0, 0, 3.5, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  private renderAnimatedCarousel(c: CanvasRenderingContext2D, time: number): void {
    const isPortrait = this.canvas.height > this.canvas.width * 1.08;
    const cx = isPortrait ? 130 : 280;
    const cy = isPortrait ? 240 : 475;
    const rot = time * 0.0016;

    c.save();
    c.translate(cx, cy);

    // Decorative Carousel Shadow
    c.fillStyle = "rgba(7, 4, 20, 0.45)";
    c.beginPath();
    c.ellipse(0, 42, 70, 14, 0, 0, Math.PI * 2);
    c.fill();

    // Base Rotating Platform
    c.fillStyle = "#251747";
    c.beginPath();
    c.ellipse(0, 36, 68, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ffd65a";
    c.lineWidth = 2.5;
    c.stroke();

    // Center Mirror Column
    c.fillStyle = "#3c2069";
    c.fillRect(-12, -20, 24, 52);
    c.strokeStyle = "#ffbe26";
    c.lineWidth = 1.5;
    c.strokeRect(-12, -20, 24, 52);

    // Mirror Shimmer Reflection
    const shimmer = Math.sin(time * 0.003) * 6;
    c.fillStyle = "rgba(255, 255, 255, 0.4)";
    c.fillRect(-6 + shimmer, -18, 5, 48);

    // 6 Animated Carousel Horses on Brass Poles (Render back horses first, then front)
    const horseCount = 6;
    const horseColors = ["#f8f9fa", "#ff7da7", "#66f4cb", "#ffd85a", "#d4a5ff", "#ff9b71"];
    const horses: Array<{ index: number; angle: number; depth: number; x: number; y: number; bob: number }> = [];

    for (let i = 0; i < horseCount; i++) {
      const a = rot + (i * Math.PI * 2) / horseCount;
      const depth = Math.sin(a); // -1 back, +1 front
      const hx = Math.cos(a) * 48;
      const hy = 16 + depth * 11;
      const bob = Math.sin(time * 0.005 + i * 1.8) * 7;
      horses.push({ index: i, angle: a, depth, x: hx, y: hy + bob, bob });
    }

    // Sort by depth (draw back horses first)
    horses.sort((a, b) => a.depth - b.depth);

    for (const h of horses) {
      c.save();
      const scale = 0.75 + 0.25 * ((h.depth + 1) / 2);
      c.globalAlpha = h.depth < -0.1 ? 0.65 : 1;

      // Brass Vertical Pole
      c.strokeStyle = "#ffe066";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(h.x, -22);
      c.lineTo(h.x, 34);
      c.stroke();
      c.strokeStyle = "#a17010";
      c.lineWidth = 0.8;
      c.stroke();

      // Horse Figure
      c.translate(h.x, h.y);
      c.scale(scale, scale);

      // Facing direction follows carousel rotation (facing right when in front, left when in back)
      const facing = Math.cos(h.angle) >= 0 ? 1 : -1;
      c.scale(facing, 1);

      const horseCol = horseColors[h.index % horseColors.length]!;

      // Horse Body & Legs
      c.fillStyle = horseCol;
      // Body
      round(c, -11, -5, 22, 10, 4);
      c.fill();
      // Neck & Head
      c.beginPath();
      c.moveTo(4, -4);
      c.lineTo(10, -14);
      c.lineTo(15, -12);
      c.lineTo(13, -4);
      c.closePath();
      c.fill();
      // Mane & Saddle
      c.fillStyle = "#ff5e7e";
      c.fillRect(-4, -6, 9, 7);
      // Legs
      c.strokeStyle = horseCol;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(-7, 4);
      c.lineTo(-10, 13);
      c.moveTo(-4, 4);
      c.lineTo(-2, 13);
      c.moveTo(5, 4);
      c.lineTo(8, 13);
      c.moveTo(8, 4);
      c.lineTo(12, 12);
      c.stroke();

      c.restore();
    }

    // Ornate Carousel Roof & Striped Canopy
    // Canopy Scalloped Cornice
    c.fillStyle = "#2d1754";
    round(c, -65, -28, 130, 12, 4);
    c.fill();
    c.strokeStyle = "#ffd65a";
    c.lineWidth = 2.5;
    c.stroke();

    // Rotating Cornice Light Bulbs
    const bulbColors = ["#ff4d6d", "#4de8dc", "#ffd65a", "#ffffff"];
    for (let b = -60; b <= 60; b += 12) {
      const colorIdx = Math.floor(Math.abs(b + time * 0.02) / 12) % bulbColors.length;
      c.fillStyle = bulbColors[colorIdx]!;
      c.beginPath();
      c.arc(b, -22, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // Conical Striped Tent Roof
    c.save();
    c.beginPath();
    c.moveTo(0, -62);
    c.lineTo(-65, -28);
    c.lineTo(65, -28);
    c.closePath();
    c.fillStyle = "#3f1b73";
    c.fill();

    // Dynamic rotating roof stripes (alternating gold and crimson)
    const stripeCount = 8;
    for (let s = 0; s < stripeCount; s++) {
      const sa = ((rot * 1.5 + (s * Math.PI * 2) / stripeCount) % (Math.PI * 2)) - Math.PI;
      const sx = Math.sin(sa) * 62;
      const nextSx = Math.sin(sa + (Math.PI * 2) / (stripeCount * 2)) * 62;
      if (Math.cos(sa) > -0.2) {
        c.fillStyle = s % 2 === 0 ? "#ffd65a" : "#ff4d6d";
        c.beginPath();
        c.moveTo(0, -62);
        c.lineTo(sx, -28);
        c.lineTo(nextSx, -28);
        c.closePath();
        c.fill();
      }
    }
    c.restore();

    // Golden Roof Crest & Pennant Flag
    c.fillStyle = "#ffd65a";
    c.beginPath();
    c.arc(0, -62, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ffd65a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -62);
    c.lineTo(0, -78);
    c.stroke();
    // Waving Pennant Flag
    c.fillStyle = "#4de8dc";
    c.beginPath();
    c.moveTo(0, -78);
    c.lineTo(16, -72 + Math.sin(time * 0.008) * 2);
    c.lineTo(0, -66);
    c.closePath();
    c.fill();

    c.restore();
  }

  private arena(c: CanvasRenderingContext2D): void {
    const scale = this.arenaSize / ARENA;
    c.save();
    c.translate(this.arenaX, this.arenaY);
    c.scale(scale, scale);

    if (this.assets.isReady("parkingLot")) {
      c.drawImage(this.assets.get("parkingLot")!, 0, 0, ARENA, ARENA);
      c.restore();
      return;
    }

    c.fillStyle = "#2a2b45";
    c.fillRect(0, 0, ARENA, ARENA);
    c.strokeStyle = "#796d9d";
    c.lineWidth = 17;
    c.strokeRect(0, 0, ARENA, ARENA);
    c.restore();
  }

  private world(c: CanvasRenderingContext2D, x: number, y: number): void {
    c.translate(this.arenaX, this.arenaY);
    c.scale(this.arenaSize / ARENA, this.arenaSize / ARENA);
    c.translate(x, y);
  }

  private renderLandmarks(c: CanvasRenderingContext2D, landmarks: Landmark[]): void {
    for (const lm of landmarks) {
      c.save();
      this.world(c, lm.x, lm.y);

      const assetKey = lm.kind === "booth" ? "snackBooth" : lm.kind === "truck" ? "snackTruck" : "planterIsland";
      const image = this.assets.get(assetKey);
      if (image && this.assets.isReady(assetKey)) {
        const width = lm.kind === "truck" ? lm.radius * 3.2 : lm.radius * 2.8;
        const height = lm.kind === "truck" ? lm.radius * 2.25 : lm.radius * 2.6;
        c.drawImage(image, -width / 2, -height / 2, width, height);
      } else if (lm.kind === "booth") {
        c.fillStyle = "#4a2c7a";
        round(c, -lm.radius, -lm.radius, lm.radius * 2, lm.radius * 2, 8);
        c.fill();
        c.fillStyle = "#f44336";
        round(c, -lm.radius + 4, -lm.radius + 4, lm.radius * 2 - 8, lm.radius * 2 - 8, 6);
        c.fill();
        c.fillStyle = "#fff";
        c.font = "bold 10px Arial";
        c.textAlign = "center";
        c.fillText("SNACK", 0, 4);
      } else {
        // truck
        c.fillStyle = "#253b5c";
        round(c, -lm.radius * 1.2, -lm.radius * 0.7, lm.radius * 2.4, lm.radius * 1.4, 6);
        c.fill();
      }

      c.restore();
    }
  }

  private renderCarousel(c: CanvasRenderingContext2D, carousel: CarouselEvent | null, time: number): void {
    if (!carousel) return;
    c.save();
    this.world(c, carousel.x, carousel.y);

    const pulse = 1 + Math.sin(time * 0.012) * 0.06;
    if (carousel.phase === "warning") {
      c.fillStyle = "rgba(255, 82, 111, .15)";
      c.beginPath(); c.arc(0, 0, carousel.armLength + 32, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(255, 214, 90, .9)";
      c.lineWidth = 5;
      c.setLineDash([11, 8]);
      c.beginPath(); c.arc(0, 0, carousel.armLength + 24, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#fff1b2";
      c.font = "900 18px Arial";
      c.textAlign = "center";
      c.fillText("SWEEPER INCOMING", 0, -carousel.armLength - 42);
    }

    const hub = this.assets.get("carouselHub");
    if (hub && this.assets.isReady("carouselHub")) c.drawImage(hub, -44 * pulse, -44 * pulse, 88 * pulse, 88 * pulse);
    else { c.fillStyle = "#ff5e7e"; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill(); }
    if (carousel.phase === "warning") { c.restore(); return; }

    // Rotating arm
    const endX = Math.cos(carousel.angle) * carousel.armLength;
    const endY = Math.sin(carousel.angle) * carousel.armLength;

    c.strokeStyle = "#ffd65a";
    c.lineWidth = 10;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(endX, endY);
    c.stroke();

    // Sweeper cart rotates with the arm, so its approach direction is obvious.
    c.save();
    c.translate(endX, endY);
    c.rotate(carousel.angle);
    const sweeper = this.assets.get("carouselSweeper");
    if (sweeper && this.assets.isReady("carouselSweeper")) c.drawImage(sweeper, -34, -30, 68, 60);
    else { c.fillStyle = Math.sin(time * 0.02) > 0 ? "#78e9ff" : "#ff4d6d"; c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill(); }
    c.restore();

    c.restore();
  }

  private trail(c: CanvasRenderingContext2D, p: PlayerCart): void {
    if (p.trail.length < 2) return;
    c.save();
    this.world(c, 0, 0);
    c.lineCap = "round";
    for (let i = 1; i < p.trail.length; i++) {
      const previous = p.trail[i - 1]!;
      const point = p.trail[i]!;
      const alpha = Math.min(previous.alpha, point.alpha);
      if (alpha <= 0) continue;
      c.strokeStyle = i % 3 === 0 ? `rgba(218, 112, 191, ${alpha * .52})` : `rgba(109, 241, 226, ${alpha * .58})`;
      c.lineWidth = 4 + alpha * 11;
      c.beginPath(); c.moveTo(previous.x, previous.y); c.lineTo(point.x, point.y); c.stroke();
    }
    c.restore();
  }

  private rascal(
    c: CanvasRenderingContext2D,
    p: PlayerCart,
    time: number,
    frenzyTimer = 0,
    sugarRushTimer = 0,
    magnetTimer = 0
  ): void {
    c.save();
    this.world(c, p.x, p.y);
    c.rotate(p.heading);
    c.translate(0, p.lean * 6);

    // Sugar Rush Fire Shield & Orbiting Sparks
    if (sugarRushTimer > 0) {
      c.save();
      const firePulse = Math.sin(time * 0.025) * 5;
      c.strokeStyle = "#ff5722";
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(0, 0, 52 + firePulse, 36 + firePulse * 0.7, 0, 0, Math.PI * 2);
      c.stroke();

      const f1 = time * 0.02;
      c.fillStyle = "#ffab40";
      c.beginPath();
      c.arc(Math.cos(f1) * 56, Math.sin(f1) * 40, 4, 0, Math.PI * 2);
      c.arc(Math.cos(f1 + Math.PI) * 56, Math.sin(f1 + Math.PI) * 40, 4, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // Magnet Electric Field Ring
    if (magnetTimer > 0) {
      c.save();
      const magPulse = Math.sin(time * 0.018) * 4;
      c.strokeStyle = "rgba(0, 229, 255, 0.8)";
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.lineDashOffset = time * 0.03;
      c.beginPath();
      c.arc(0, 0, 50 + magPulse, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    // Frenzy speed aura and sparks
    if (frenzyTimer > 0) {
      c.save();
      const auraPulse = Math.sin(time * 0.02) * 4;
      c.strokeStyle = "rgba(255, 215, 64, 0.75)";
      c.lineWidth = 3.5;
      c.beginPath();
      c.ellipse(0, 0, 48 + auraPulse, 32 + auraPulse * 0.7, 0, 0, Math.PI * 2);
      c.stroke();

      const flare = time * 0.012;
      c.fillStyle = "#ffe785";
      c.beginPath();
      c.arc(Math.cos(flare) * 52, Math.sin(flare) * 36, 3.5, 0, Math.PI * 2);
      c.arc(Math.cos(flare + Math.PI) * 52, Math.sin(flare + Math.PI) * 36, 3.5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    if (this.assets.isReady("rascalCart")) {
      const img = this.assets.get("rascalCart")!;
      const w = 96;
      const h = 66;
      c.drawImage(img, -48, -33, w, h);

      // Dynamic animated scarf tip flutter
      c.save();
      c.translate(-26, -10);
      c.strokeStyle = "#e274bf";
      c.lineWidth = 3.5;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-10, Math.sin(time * 0.015) * 5, -17, Math.sin(time * 0.02) * 7);
      c.stroke();
      c.restore();

      c.restore();
      return;
    }

    c.fillStyle = "#24315f";
    c.beginPath();
    c.ellipse(-18, 0, 20, 13, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#55dcd1";
    round(c, -7, -19, 42, 38, 12);
    c.fill();
    c.fillStyle = "#f7c64e";
    c.beginPath();
    c.arc(-6, -17, 15, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  private bot(c: CanvasRenderingContext2D, bot: SecurityBot, time: number): void {
    c.save();
    this.world(c, bot.x, bot.y);

    if (bot.state === "warning") {
      c.strokeStyle = "rgba(255,105,127,.9)";
      c.lineWidth = 4;
      c.setLineDash([8, 7]);
      c.beginPath();
      c.arc(0, 0, 36, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#ff9b64";
      c.font = "800 14px Arial";
      c.textAlign = "center";
      c.fillText("!", 0, 5);
      c.restore();
      return;
    }

    c.rotate(bot.heading);
    c.globalAlpha = bot.state === "disabled" ? Math.max(0.2, bot.disabled / 0.8) : 1;

    const assetKey = bot.kind === "heavy" ? "heavySecurityCart" : "securityBot";

    if (this.assets.isReady(assetKey)) {
      const img = this.assets.get(assetKey)!;
      if (bot.kind === "heavy") {
        c.drawImage(img, -44, -34, 88, 68);
      } else {
        c.drawImage(img, -32, -27, 64, 54);
      }

      // Flashing strobe beacon glow
      const strobe = Math.sin(time * 0.02 + bot.id * 2);
      c.fillStyle = strobe > 0 ? "rgba(120, 233, 255, 0.75)" : "rgba(255, 220, 85, 0.75)";
      c.beginPath();
      c.arc(0, 0, 10 + (strobe > 0 ? 3 : 0), 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = "#18254f";
      round(c, -27, -18, 54, 36, 11);
      c.fill();
      c.fillStyle = "#e75269";
      round(c, -20, -14, 40, 28, 9);
      c.fill();
    }

    // Stun halo with rotating stars when bot is knocked out
    if (bot.state === "disabled") {
      c.save();
      c.translate(0, -22);
      const haloRadius = 15;
      const starAngle = time * 0.009;
      for (let s = 0; s < 3; s++) {
        const a = starAngle + (s * Math.PI * 2) / 3;
        const sx = Math.cos(a) * haloRadius;
        const sy = Math.sin(a) * (haloRadius * 0.4);
        c.fillStyle = s % 2 === 0 ? "#ffd85b" : "#ff7b54";
        c.beginPath();
        c.arc(sx, sy, 3.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }

    c.restore();
  }

  private snack(c: CanvasRenderingContext2D, snack: Snack, time: number): void {
    c.save();
    this.world(c, snack.x, snack.y);
    const pulse = 1 + Math.sin(time * 0.01 + snack.id) * 0.1;
    c.scale(pulse, pulse);

    if (snack.kind === "popcorn" && this.assets.isReady("popcorn")) {
      const img = this.assets.get("popcorn")!;
      c.drawImage(img, -18, -18, 36, 36);
      c.restore();
      return;
    }

    if (snack.kind === "donut" && this.assets.isReady("donut")) {
      const img = this.assets.get("donut")!;
      c.drawImage(img, -24, -24, 48, 48);
      c.restore();
      return;
    }

    if (snack.kind === "bag" && this.assets.isReady("snackBag")) {
      const img = this.assets.get("snackBag")!;
      c.drawImage(img, -22, -26, 44, 52);
      c.restore();
      return;
    }

    const special = snack.kind !== "popcorn";
    c.fillStyle = snack.kind === "donut" ? "#ffd75b" : snack.kind === "bag" ? "#66f4cb" : "#fff0bd";
    c.shadowColor = c.fillStyle;
    c.shadowBlur = special ? 18 : 8;

    if (snack.kind === "donut") {
      c.beginPath();
      c.arc(0, 0, 16, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#9d5a49";
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI * 2);
      c.fill();
    } else if (snack.kind === "bag") {
      c.fillStyle = "#d99a51";
      round(c, -15, -18, 30, 38, 5);
      c.fill();
    } else {
      c.beginPath();
      c.arc(-5, 0, 7, 0, Math.PI * 2);
      c.arc(5, 0, 7, 0, Math.PI * 2);
      c.arc(0, -5, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  private particle(c: CanvasRenderingContext2D, p: Particle): void {
    c.save();
    this.world(c, p.x, p.y);
    c.globalAlpha = Math.max(0, p.life / p.max);
    c.fillStyle = p.color;
    c.beginPath();
    c.arc(0, 0, p.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  private directionHint(c: CanvasRenderingContext2D, p: PlayerCart, elapsed: number): void {
    if (elapsed > 5) return;
    c.save();
    this.world(c, p.x, p.y);
    c.strokeStyle = "rgba(255,255,255,.85)";
    c.lineWidth = 3.5;
    c.beginPath();
    c.arc(
      0,
      0,
      68,
      p.heading + (p.turnDirection > 0 ? -0.2 : 0.2),
      p.heading + (p.turnDirection > 0 ? 1.15 : -1.15),
      p.turnDirection < 0
    );
    c.stroke();
    c.fillStyle = "#fff";
    c.font = "800 15px Arial";
    c.textAlign = "center";
    c.fillText("TAP TO DRIFT", 0, -52);
    c.restore();
  }

  private streakBoost(c: CanvasRenderingContext2D, player: PlayerCart, timer: number, time: number): void {
    if (!timer) return;
    const strength = Math.min(1, timer / 2.5);
    c.save();
    this.world(c, player.x, player.y);
    c.strokeStyle = `rgba(255, 207, 87, ${0.18 + strength * 0.22})`;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(0, 0, 43 + Math.sin(time * 0.012) * 3, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = `rgba(102, 244, 203, ${0.35 + strength * 0.35})`;
    for (let i = 0; i < 3; i++) {
      const angle = time * 0.004 + i * (Math.PI * 2 / 3);
      const radius = 49 + Math.sin(time * 0.01 + i) * 5;
      c.beginPath();
      c.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 3.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  private renderSkids(c: CanvasRenderingContext2D, marks: SkidMark[]): void {
    if (!marks.length) return;
    c.save();
    this.world(c, 0, 0);
    c.lineCap = "round";
    for (const m of marks) {
      if (m.alpha <= 0) continue;
      c.strokeStyle = `rgba(18, 14, 38, ${m.alpha * 0.45})`;
      c.lineWidth = m.width;
      c.beginPath();
      c.moveTo(m.x1, m.y1);
      c.lineTo(m.x2, m.y2);
      c.stroke();
    }
    c.restore();
  }

  private renderShockwaves(c: CanvasRenderingContext2D, shockwaves: Shockwave[]): void {
    if (!shockwaves.length) return;
    for (const s of shockwaves) {
      const alpha = Math.max(0, s.life / s.maxLife);
      if (alpha <= 0) continue;
      c.save();
      this.world(c, s.x, s.y);
      c.strokeStyle = s.color;
      c.globalAlpha = alpha * 0.85;
      c.lineWidth = Math.max(1, s.lineWidth * alpha);
      c.beginPath();
      c.arc(0, 0, s.radius, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  private renderFloatingTexts(c: CanvasRenderingContext2D, texts: FloatingText[]): void {
    if (!texts.length) return;
    for (const t of texts) {
      const progress = 1 - Math.max(0, t.life / t.maxLife);
      if (progress >= 1) continue;
      const pop = progress < 0.2 ? 1 + (0.2 - progress) * 2.2 : 1;
      const alpha = progress > 0.65 ? (1 - progress) / 0.35 : 1;

      c.save();
      this.world(c, t.x, t.y);
      c.scale(pop, pop);
      c.globalAlpha = Math.max(0, Math.min(1, alpha));
      c.font = `900 ${t.size}px 'Arial Black', Impact, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";

      // Dark stroke outline
      c.strokeStyle = "rgba(10, 8, 26, 0.92)";
      c.lineWidth = Math.max(3, t.size * 0.24);
      c.lineJoin = "round";
      c.strokeText(t.text, 0, 0);

      // Core fill
      c.fillStyle = t.color;
      c.fillText(t.text, 0, 0);

      c.restore();
    }
  }

  private renderPowerUps(c: CanvasRenderingContext2D, powerUps: PowerUp[], time: number): void {
    if (!powerUps.length) return;
    for (const p of powerUps) {
      if (p.collected) continue;
      const isBlinking = p.life < 3.0 && Math.sin(time * 0.03) > 0;
      if (isBlinking) continue;

      c.save();
      this.world(c, p.x, p.y);
      const bob = Math.sin(time * 0.008 + p.id) * 3;
      c.translate(0, bob);

      const pulse = 1 + Math.sin(time * 0.012 + p.id) * 0.08;
      c.scale(pulse, pulse);

      const isSugar = p.kind === "sugar_rush";
      const coreColor = isSugar ? "#ff5722" : "#00e5ff";
      const glowColor = isSugar ? "rgba(255, 87, 34, 0.4)" : "rgba(0, 229, 255, 0.4)";

      // Outer rotating halo ring
      c.save();
      c.rotate(time * (isSugar ? 0.003 : -0.003));
      c.strokeStyle = coreColor;
      c.lineWidth = 2.5;
      c.setLineDash([7, 5]);
      c.beginPath();
      c.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      c.stroke();
      c.restore();

      // Glowing circular badge background
      c.fillStyle = glowColor;
      c.beginPath();
      c.arc(0, 0, p.radius + 3, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = isSugar ? "#bf360c" : "#006064";
      c.beginPath();
      c.arc(0, 0, p.radius, 0, Math.PI * 2);
      c.fill();

      c.strokeStyle = "#ffffff";
      c.lineWidth = 2;
      c.stroke();

      // Emblem icon
      c.font = `bold ${p.radius * 1.05}px Arial`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(isSugar ? "⚡" : "🧲", 0, 1);

      c.restore();
    }
  }

  private renderMagnetBeams(c: CanvasRenderingContext2D, player: PlayerCart, snacks: Snack[], time: number): void {
    c.save();
    this.world(c, 0, 0);
    c.strokeStyle = "rgba(0, 229, 255, 0.35)";
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.lineDashOffset = -time * 0.04;
    for (const snack of snacks) {
      if (snack.collected) continue;
      const d = Math.hypot(player.x - snack.x, player.y - snack.y);
      if (d < 250) {
        c.beginPath();
        c.moveTo(player.x, player.y);
        c.lineTo(snack.x, snack.y);
        c.stroke();
      }
    }
    c.restore();
  }
}

function round(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  c.beginPath();
  c.roundRect(x, y, width, height, radius);
}
