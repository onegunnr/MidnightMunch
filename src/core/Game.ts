import { AudioManager } from "../audio/AudioManager";
import { Renderer } from "../rendering/Renderer";
import { SaveManager } from "../save/SaveManager";
import { Random } from "./Random";
import type { PlatformAdapter } from "../platform/PlatformAdapter";
import type { CarouselEvent, Encounter, FloatingText, GameState, Landmark, Particle, PlayerCart, PowerUp, PowerUpKind, SecurityBot, Shockwave, SkidMark, Snack } from "./types";

const ARENA = 900;
const CENTER = ARENA / 2;
const EDGE = 39;
const TAU = Math.PI * 2;

export class Game {
  private state: GameState = "MENU";
  private readonly random = new Random();
  private readonly audio = new AudioManager();
  private readonly save: SaveManager;
  private player: PlayerCart = this.newPlayer();
  private bots: SecurityBot[] = [];
  private snacks: Snack[] = [];
  private particles: Particle[] = [];
  private landmarks: Landmark[] = [];
  private encounters = new Map<number, Encounter>();
  private skidMarks: SkidMark[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private powerUps: PowerUp[] = [];
  private sugarRushTimer = 0;
  private magnetTimer = 0;
  private powerUpAt = 12;
  private carousel: CarouselEvent | null = null;
  private sweeperAnchor = { x: 640, y: 640 };
  private sweeperAt = 45;
  private time = 0;
  private score = 0;
  private snackStreak = 0;
  private bestRunStreak = 0;
  private streakTimer = 0;
  private frenzyTimer = 0;
  private mischiefTimer = 0;
  private mischiefCount = 0;
  private nearMisses = 0;
  private botCrashes = 0;
  private donutCollected = false;
  private bagCollected = false;
  private spawnAt = 2.2;
  private snackAt = 0.3;
  private nextId = 1;
  private reverseQueued = false;
  private last = 0;
  private suspended = false;
  private milestone = 250;
  private toastTimer = 0;
  private dev = { invincible: false, speed: 1, scoreMultiplier: 1, practice: false };
  private menu: HTMLElement;
  private over: HTMLElement;
  private hud: HTMLElement;
  private scoreEl: HTMLElement;
  private streakEl: HTMLElement;
  private timerEl: HTMLElement;
  private toast: HTMLElement;

  constructor(private readonly renderer: Renderer, private readonly platform?: PlatformAdapter) {
    this.save = new SaveManager(this.platform, (updatedSave) => {
      const menuBest = document.getElementById("menu-best");
      if (menuBest) menuBest.textContent = String(updatedSave.bestScore);
      const menuTrophies = document.getElementById("menu-trophy-count");
      if (menuTrophies) menuTrophies.textContent = `${updatedSave.achievements.length}/6`;
    });
    this.menu = must("menu");
    this.over = must("game-over");
    this.hud = must("hud");
    this.scoreEl = must("score");
    this.streakEl = must("streak");
    this.timerEl = must("streak-timer");
    this.toast = must("toast");
    must("menu-best").textContent = String(this.save.load().bestScore);
    const initialTrophies = document.getElementById("menu-trophy-count");
    if (initialTrophies) initialTrophies.textContent = `${this.save.data.achievements.length}/6`;
    this.render(0);
    requestAnimationFrame((time) => this.loop(time));
  }

  private isModalOpen = false;

  setModalOpen(open: boolean): void {
    this.isModalOpen = open;
  }

  isModalActive(): boolean {
    return this.isModalOpen;
  }

  primary(): void {
    if (this.isModalOpen) return;
    this.audio.unlock();
    if (this.state === "MENU" || this.state === "GAME_OVER") {
      this.start();
      return;
    }
    if (this.state === "PLAYING") this.reverseQueued = true;
  }

  startPractice(): void {
    this.audio.unlock();
    this.dev.invincible = true;
    this.dev.practice = true;
    this.start();
    this.show("PRACTICE — INVINCIBLE");
  }

  setSuspended(value: boolean): void {
    this.suspended = value;
    this.last = 0;
    if (value) {
      this.audio.pauseMusic();
    } else if (this.state === "PLAYING") {
      this.audio.resumeMusic();
    }
  }

  toggleAudio(): boolean {
    return this.audio.toggleMute();
  }

  isAudioMuted(): boolean {
    return this.audio.isMuted();
  }

  setAudioEnabled(value: boolean): void {
    this.audio.setAllowed(value);
  }

  getAchievements(): string[] {
    return this.save.data.achievements;
  }

  getState(): GameState {
    return this.state;
  }

  setDev(key: "invincible" | "speed" | "scoreMultiplier", value: boolean | number): void {
    this.dev[key] = value as never;
    this.dev.practice = true;
    this.show("PRACTICE MODE");
  }

  spawnBot(): void {
    this.dev.practice = true;
    this.createBot(true);
    this.show("BOT INCOMING");
  }

  triggerSweeper(): void {
    this.dev.practice = true;
    this.spawnSweeper(true);
  }

  private start(): void {
    this.state = "PLAYING";
    this.time = 0;
    this.score = 0;
    this.snackStreak = 0;
    this.bestRunStreak = 0;
    this.streakTimer = 0;
    this.frenzyTimer = 0;
    this.mischiefTimer = 0;
    this.mischiefCount = 0;
    this.nearMisses = 0;
    this.botCrashes = 0;
    this.donutCollected = false;
    this.bagCollected = false;
    this.spawnAt = 2.2;
    this.snackAt = 0.25;
    this.nextId = 1;
    this.reverseQueued = false;
    this.milestone = 250;
    this.carousel = null;
    this.sweeperAt = 45;
    this.player = this.newPlayer();
    this.bots = [];
    this.snacks = [];
    this.particles = [];
    this.skidMarks = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.powerUps = [];
    this.sugarRushTimer = 0;
    this.magnetTimer = 0;
    this.powerUpAt = 12;
    this.landmarks = this.createLandmarks();
    this.encounters.clear();
    this.isModalOpen = false;
    document.getElementById("trophies-screen")?.classList.add("hidden");
    this.menu.classList.add("hidden");
    this.over.classList.add("hidden");
    this.hud.classList.remove("hidden");
    this.toast.classList.remove("show");
    this.audio.startMusic();
    this.addSnackTrail();
  }

  private newPlayer(): PlayerCart {
    return {
      x: CENTER,
      y: CENTER,
      previousX: CENTER,
      previousY: CENTER,
      heading: -Math.PI / 2,
      turnDirection: 1,
      speed: 160,
      radius: 20,
      lean: 0,
      trail: [],
    };
  }

  private loop(now: number): void {
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;
    if (this.state === "PLAYING" && !this.suspended) this.update(dt);
    this.render(now);
    requestAnimationFrame((time) => this.loop(time));
  }

  private update(dt: number): void {
    this.time += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (!this.toastTimer) this.toast.classList.remove("show");
    this.frenzyTimer = Math.max(0, this.frenzyTimer - dt);
    this.mischiefTimer = Math.max(0, this.mischiefTimer - dt);
    if (!this.mischiefTimer) this.mischiefCount = 0;
    this.sugarRushTimer = Math.max(0, this.sugarRushTimer - dt);
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    const multiplier = this.multiplier();
    this.score += dt * 10 * this.scoreFactor() * this.dev.scoreMultiplier;

    if (this.reverseQueued) {
      this.player.turnDirection *= -1;
      this.player.lean = this.player.turnDirection * 0.7;
      this.audio.tone(300 + this.player.turnDirection * 45, 0.06, "triangle", 0.045);
      this.emit(this.player.x, this.player.y, "#d7f8ff", 5);
      this.emitDriftSmoke(this.player.x, this.player.y, this.player.heading);
    }
    this.reverseQueued = false;

    this.movePlayer(dt);
    this.updateBots(dt);
    this.updateCarousel(dt);
    this.resolveLandmarkCrashes();
    this.resolveBotCrashes();
    this.resolveSweeperCrashes();
    if (this.checkPlayerHits()) return;
    this.updateSnacks();
    this.updatePowerUps(dt);
    this.updateMagnetPull(dt);
    this.updateEncounters(dt);

    this.streakTimer = Math.max(0, this.streakTimer - dt);
    if (this.streakTimer === 0 && this.snackStreak) {
      this.snackStreak = 0;
      this.show("SNACK STREAK LOST");
    }

    if (this.time >= this.spawnAt) {
      this.createBot(false);
      this.spawnAt += this.time < 30 ? 10 : this.time < 55 ? 7.6 : 6.2;
    }
    if (this.time >= this.snackAt) {
      this.addSnackTrail();
      this.snackAt += 4.2;
    }
    if (this.time >= this.powerUpAt) {
      this.spawnPowerUp();
      this.powerUpAt += this.random.between(22, 28);
    }
    if (this.time >= this.sweeperAt && !this.carousel) {
      this.spawnSweeper(false);
    }

    this.updateParticles(dt);
    this.updateJuice(dt);
    if (this.score >= this.milestone) {
      this.show(`${this.milestone} POINTS!`);
      this.emit(this.player.x, this.player.y, "#ffdc59", 16);
      this.milestone += 250;
    }
    this.updateHud(multiplier);
  }

  private movePlayer(dt: number): void {
    const p = this.player;
    p.previousX = p.x;
    p.previousY = p.y;
    const speedBonus = this.sugarRushTimer > 0 ? 1.35 : 1;
    const speed = p.speed * this.difficulty().playerSpeed * this.dev.speed * speedBonus;
    const turnRate = speed / 105;
    p.heading = wrap(p.heading + p.turnDirection * turnRate * dt);
    p.x += Math.cos(p.heading) * speed * dt;
    p.y += Math.sin(p.heading) * speed * dt;
    p.lean *= 0.9;

    if (Math.abs(p.lean) > 0.16 || this.frenzyTimer > 0 || this.sugarRushTimer > 0) {
      this.addSkidMarks(p.x, p.y, p.heading, p.previousX, p.previousY);
    }
    if (this.sugarRushTimer > 0) {
      this.emit(p.x - Math.cos(p.heading) * 16, p.y - Math.sin(p.heading) * 16, "#ff7043", 1);
    }

    let reflected = false;
    if (p.x < EDGE) {
      p.x = EDGE;
      p.heading = Math.PI - p.heading;
      reflected = true;
    } else if (p.x > ARENA - EDGE) {
      p.x = ARENA - EDGE;
      p.heading = Math.PI - p.heading;
      reflected = true;
    }
    if (p.y < EDGE) {
      p.y = EDGE;
      p.heading = -p.heading;
      reflected = true;
    } else if (p.y > ARENA - EDGE) {
      p.y = ARENA - EDGE;
      p.heading = -p.heading;
      reflected = true;
    }
    if (reflected) {
      p.heading = wrap(p.heading);
      p.lean = -0.4 * p.turnDirection;
      this.emit(p.x, p.y, "#9ee7ef", 9);
      this.renderer.shake = Math.max(this.renderer.shake, 4);
    }
    p.trail.push({ x: p.x, y: p.y, alpha: 1 });
    if (p.trail.length > 20) p.trail.shift();
    for (const point of p.trail) point.alpha = Math.max(0, point.alpha - dt * 1.65);
  }

  private updateJuice(dt: number): void {
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life > 0);

    for (const sw of this.shockwaves) {
      sw.radius += (sw.maxRadius - sw.radius) * 11 * dt;
      sw.life -= dt;
    }
    this.shockwaves = this.shockwaves.filter((sw) => sw.life > 0);

    for (const sm of this.skidMarks) {
      sm.alpha -= dt * 0.35;
    }
    this.skidMarks = this.skidMarks.filter((sm) => sm.alpha > 0);
  }

  private addFloatingText(x: number, y: number, text: string, color: string, size = 16): void {
    this.floatingTexts.push({
      id: this.nextId++,
      text,
      x,
      y,
      vy: -44,
      life: 0.95,
      maxLife: 0.95,
      color,
      size,
    });
    if (this.floatingTexts.length > 25) this.floatingTexts.shift();
  }

  private addShockwave(x: number, y: number, maxRadius: number, color: string, lineWidth = 4): void {
    this.shockwaves.push({
      id: this.nextId++,
      x,
      y,
      radius: 6,
      maxRadius,
      life: 0.45,
      maxLife: 0.45,
      color,
      lineWidth,
    });
    if (this.shockwaves.length > 16) this.shockwaves.shift();
  }

  private addSkidMarks(x: number, y: number, heading: number, prevX: number, prevY: number): void {
    const perpX = -Math.sin(heading);
    const perpY = Math.cos(heading);
    const halfAxle = 10;

    this.skidMarks.push({
      x1: prevX + perpX * halfAxle,
      y1: prevY + perpY * halfAxle,
      x2: x + perpX * halfAxle,
      y2: y + perpY * halfAxle,
      alpha: 0.9,
      width: 4,
    });

    this.skidMarks.push({
      x1: prevX - perpX * halfAxle,
      y1: prevY - perpY * halfAxle,
      x2: x - perpX * halfAxle,
      y2: y - perpY * halfAxle,
      alpha: 0.9,
      width: 4,
    });

    if (this.skidMarks.length > 100) this.skidMarks.splice(0, this.skidMarks.length - 100);
  }

  private emitDriftSmoke(x: number, y: number, heading: number): void {
    const rearX = x - Math.cos(heading) * 16;
    const rearY = y - Math.sin(heading) * 16;
    for (let i = 0; i < 4; i++) {
      const a = heading + Math.PI + this.random.between(-0.6, 0.6);
      const speed = this.random.between(15, 45);
      this.particles.push({
        x: rearX,
        y: rearY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: this.random.between(0.25, 0.5),
        max: 0.5,
        size: this.random.between(4, 9),
        color: "rgba(225, 238, 250, 0.65)",
      });
    }
  }

  private createBot(manual: boolean): void {
    const active = this.bots.filter((bot) => bot.state !== "disabled").length;
    if (!manual && active >= this.botCap()) return;
    const side = Math.floor(this.random.next() * 4);
    const pad = 16;
    let x = pad;
    let y = this.random.between(90, ARENA - 90);
    if (side === 1) {
      x = ARENA - pad;
    } else if (side === 2) {
      x = this.random.between(90, ARENA - 90);
      y = pad;
    } else if (side === 3) {
      x = this.random.between(90, ARENA - 90);
      y = ARENA - pad;
    }
    if (distance(x, y, this.player.x, this.player.y) < 330) {
      x = side < 2 ? (side ? ARENA - pad : pad) : this.random.between(90, ARENA - 90);
      y = side < 2 ? this.random.between(90, ARENA - 90) : (side === 2 ? pad : ARENA - pad);
    }
    const heavy = this.time >= 30 && this.random.next() < 0.24 && !this.bots.some((bot) => bot.kind === "heavy" && bot.state !== "disabled");
    this.bots.push({
      id: this.nextId++,
      x,
      y,
      previousX: x,
      previousY: y,
      heading: angleTo(x, y, this.player.x, this.player.y),
      speed: heavy ? 101 : 115,
      turnRate: heavy ? 0.82 : 1.25,
      radius: heavy ? 32 : 24,
      kind: heavy ? "heavy" : "scooter",
      state: "warning",
      warning: 1.2,
      disabled: 0,
    });
  }

  private updateBots(dt: number): void {
    for (const bot of this.bots) {
      bot.previousX = bot.x;
      bot.previousY = bot.y;
      if (bot.state === "warning") {
        bot.warning -= dt;
        if (bot.warning <= 0) {
          bot.state = "active";
          this.show(bot.kind === "heavy" ? "HEAVY SECURITY CART!" : "SECURITY INCOMING!");
        }
        continue;
      }
      if (bot.state === "disabled") {
        bot.disabled -= dt;
        continue;
      }
      const desired = angleTo(bot.x, bot.y, this.player.x, this.player.y);
      const difference = angleDifference(desired, bot.heading);
      const limit = bot.turnRate * dt;
      bot.heading = wrap(bot.heading + Math.max(-limit, Math.min(limit, difference)));
      const speed = bot.speed * this.difficulty().botSpeed;
      bot.x += Math.cos(bot.heading) * speed * dt;
      bot.y += Math.sin(bot.heading) * speed * dt;
      if (bot.x < -35 || bot.x > ARENA + 35 || bot.y < -35 || bot.y > ARENA + 35) {
        bot.heading = angleTo(bot.x, bot.y, CENTER, CENTER);
      }
    }
    this.bots = this.bots.filter((bot) => bot.state !== "disabled" || bot.disabled > 0);
  }

  private resolveBotCrashes(): void {
    for (let i = 0; i < this.bots.length; i++) {
      for (let j = i + 1; j < this.bots.length; j++) {
        const a = this.bots[i]!;
        const b = this.bots[j]!;
        if (a.state !== "active" || b.state !== "active" || distance(a.x, a.y, b.x, b.y) > a.radius + b.radius) continue;
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2;
        if (a.kind === "heavy" || b.kind === "heavy") {
          const heavy = a.kind === "heavy" ? a : b;
          const light = heavy === a ? b : a;
          light.state = "disabled";
          light.disabled = 0.8;
          heavy.heading = wrap(heavy.heading + Math.PI * 0.32);
          this.botCrashes++;
          this.awardMischief(125, "HEAVY DEFLECTION!", x, y, "#ffcf57");
          this.emit(x, y, "#ffcf57", 18);
          this.renderer.shake = Math.max(this.renderer.shake, 10);
          this.addShockwave(x, y, 62, "#ffcf57", 5);
        } else {
          a.state = "disabled";
          b.state = "disabled";
          a.disabled = 0.8;
          b.disabled = 0.8;
          this.botCrashes++;
          this.awardMischief(100, "OUTSMARTED!", x, y, "#ffd85b");
          this.emit(x, y, "#ffd85b", 24);
          this.renderer.shake = Math.max(this.renderer.shake, 7.5);
          this.addShockwave(x, y, 54, "#ffd85b", 4.5);
        }
        this.audio.collect(true);
      }
    }
  }

  private spawnSweeper(force = false): void {
    if (this.carousel && !force) return;
    this.carousel = {
      x: this.sweeperAnchor.x,
      y: this.sweeperAnchor.y,
      angle: this.random.between(0, TAU),
      armLength: 125,
      phase: "warning",
      warning: 2.2,
      remaining: 10,
    };
    this.show("SWEEPER CART INCOMING!");
    this.audio.tone(280, 0.35, "triangle", 0.07);
  }

  private updateCarousel(dt: number): void {
    if (!this.carousel) return;
    const c = this.carousel;
    if (c.phase === "warning") {
      c.warning -= dt;
      if (c.warning <= 0) {
        c.phase = "active";
        this.show("SWEEPER ACTIVE!");
        this.audio.tone(520, 0.25, "sawtooth", 0.08);
      }
    } else {
      c.angle = wrap(c.angle + 1.4 * dt);
      c.remaining -= dt;
      if (c.remaining <= 0) {
        this.carousel = null;
        this.sweeperAt = this.time + 35;
      }
    }
  }

  private resolveSweeperCrashes(): void {
    if (!this.carousel || this.carousel.phase !== "active") return;
    const c = this.carousel;
    const tipX = c.x + Math.cos(c.angle) * c.armLength;
    const tipY = c.y + Math.sin(c.angle) * c.armLength;
    for (const bot of this.bots) {
      if (bot.state !== "active") continue;
      const hitHub = distance(bot.x, bot.y, c.x, c.y) < bot.radius + 20;
      const hitTip = distance(bot.x, bot.y, tipX, tipY) < bot.radius + 22;
      const hitArm = pointSegmentDistance(bot.x, bot.y, c.x, c.y, tipX, tipY) < bot.radius + 5;
      if (hitHub || hitTip || hitArm) {
        bot.state = "disabled";
        bot.disabled = 0.8;
        this.botCrashes++;
        this.awardMischief(150, "SWEEPER SMASH!", bot.x, bot.y, "#ff7b54");
        this.audio.collect(true);
        this.emit(bot.x, bot.y, "#ff7b54", 22);
        this.renderer.shake = Math.max(this.renderer.shake, 14);
        this.addShockwave(bot.x, bot.y, 75, "#ff7b54", 6);
      }
    }
  }

  private checkPlayerHits(): boolean {
    if (this.dev.invincible) return false;
    for (const bot of this.bots) {
      if (bot.state === "active" && sweptDistance(this.player, bot) < this.player.radius + bot.radius - 5) {
        if (this.sugarRushTimer > 0) {
          this.resolvePlayerRam(bot);
        } else {
          this.end();
          return true;
        }
      }
    }
    for (const landmark of this.landmarks) {
      if (distance(this.player.x, this.player.y, landmark.x, landmark.y) < this.player.radius + landmark.radius - 4) {
        this.end();
        return true;
      }
    }
    if (this.carousel && this.carousel.phase === "active") {
      const c = this.carousel;
      const tipX = c.x + Math.cos(c.angle) * c.armLength;
      const tipY = c.y + Math.sin(c.angle) * c.armLength;
      const hitHub = distance(this.player.x, this.player.y, c.x, c.y) < this.player.radius + 20;
      const hitTip = distance(this.player.x, this.player.y, tipX, tipY) < this.player.radius + 22;
      const hitArm = pointSegmentDistance(this.player.x, this.player.y, c.x, c.y, tipX, tipY) < this.player.radius + 5;
      if (hitHub || hitTip || hitArm) {
        this.end();
        return true;
      }
    }
    return false;
  }

  private updateSnacks(): void {
    for (const snack of this.snacks) {
      if (!snack.collected && distance(this.player.x, this.player.y, snack.x, snack.y) < this.player.radius + snack.radius + 4) {
        snack.collected = true;
        const points = this.snackPoints(snack.kind) * this.multiplier() * this.scoreFactor() * this.dev.scoreMultiplier;
        this.score += points;
        if (snack.kind === "popcorn") {
          this.snackStreak++;
          this.bestRunStreak = Math.max(this.bestRunStreak, this.snackStreak);
          this.addFloatingText(snack.x, snack.y - 10, `+${points}`, "#fff1bc", 14);
        }
        if (snack.kind === "donut") {
          this.donutCollected = true;
          this.addFloatingText(snack.x, snack.y - 14, `🍩 +${points}`, "#ffd85b", 19);
          this.addShockwave(snack.x, snack.y, 44, "#ffd85b", 4);
          this.renderer.shake = Math.max(this.renderer.shake, 4);
        }
        if (snack.kind === "bag") {
          this.bagCollected = true;
          this.frenzyTimer = 5;
          this.show("SNACK FRENZY ×2!");
          this.addFloatingText(snack.x, snack.y - 14, `🎒 FRENZY! +${points}`, "#66f4cb", 20);
          this.addShockwave(snack.x, snack.y, 52, "#66f4cb", 4.5);
          this.renderer.shake = Math.max(this.renderer.shake, 5.5);
        }
        this.streakTimer = 5;
        this.audio.collect(snack.kind !== "popcorn");
        this.emit(snack.x, snack.y, snack.kind === "popcorn" ? "#fff1bc" : snack.kind === "donut" ? "#ffdc59" : "#66f4cb", snack.kind === "popcorn" ? 9 : 20);
        if (this.snackStreak && this.snackStreak % 5 === 0) this.show(`SNACK STREAK ×${this.multiplier()}!`);
      }
    }
    this.snacks = this.snacks.filter((snack) => !snack.collected);
  }

  private addSnackTrail(): void {
    const kind = this.time >= 45 && this.random.next() < 0.08 ? "bag" : this.time >= 15 && this.random.next() < 0.14 ? "donut" : "popcorn";
    const radius = kind === "popcorn" ? 12 : kind === "donut" ? 18 : 22;
    const count = kind === "popcorn" ? 3 : 1;
    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = this.random.between(0, TAU);
      const base = this.random.between(185, 330);
      const trail = Array.from({ length: count }, (_, index) => {
        const distanceFromPlayer = base + index * 34;
        return {
          x: clamp(this.player.x + Math.cos(angle) * distanceFromPlayer, 75, ARENA - 75),
          y: clamp(this.player.y + Math.sin(angle) * distanceFromPlayer, 75, ARENA - 75),
        };
      });
      const clear = trail.every(
        (spot) =>
          !this.snacks.some((snack) => distance(spot.x, spot.y, snack.x, snack.y) < radius + snack.radius + 18) &&
          !this.landmarks.some((blocker) => distance(spot.x, spot.y, blocker.x, blocker.y) < radius + blocker.radius + 24)
      );
      if (!clear) continue;
      for (const spot of trail) this.snacks.push({ id: this.nextId++, x: spot.x, y: spot.y, radius, kind, collected: false });
      return;
    }
  }

  private spawnPowerUp(): void {
    const kind: PowerUpKind = this.random.next() < 0.5 ? "sugar_rush" : "magnet";
    const radius = 22;
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = this.random.between(120, ARENA - 120);
      const y = this.random.between(120, ARENA - 120);

      const dPlayer = distance(x, y, this.player.x, this.player.y);
      if (dPlayer < 170) continue;

      const nearLandmark = this.landmarks.some((lm) => distance(x, y, lm.x, lm.y) < lm.radius + radius + 36);
      if (nearLandmark) continue;

      const nearSweeper = distance(x, y, this.sweeperAnchor.x, this.sweeperAnchor.y) < 155;
      if (nearSweeper) continue;

      this.powerUps.push({
        id: this.nextId++,
        x,
        y,
        radius,
        kind,
        collected: false,
        life: 12,
        maxLife: 12,
      });

      this.show(kind === "sugar_rush" ? "⚡ SUGAR RUSH SPAWNED!" : "🧲 SNACK MAGNET SPAWNED!");
      this.audio.tone(kind === "sugar_rush" ? 440 : 587, 0.2, "triangle", 0.06);
      this.addShockwave(x, y, 40, kind === "sugar_rush" ? "#ff5722" : "#00e5ff", 3);
      return;
    }
  }

  private updatePowerUps(dt: number): void {
    for (const p of this.powerUps) {
      if (p.collected) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.collected = true;
        continue;
      }
      if (distance(this.player.x, this.player.y, p.x, p.y) < this.player.radius + p.radius + 6) {
        p.collected = true;
        this.audio.powerup();
        if (p.kind === "sugar_rush") {
          this.sugarRushTimer = 4.5;
          this.show("⚡ SUGAR RUSH ACTIVATED! (RAM BOTS)");
          this.addFloatingText(p.x, p.y - 16, "⚡ SUGAR RUSH!", "#ff5722", 22);
          this.addShockwave(p.x, p.y, 60, "#ff5722", 5);
          this.renderer.shake = Math.max(this.renderer.shake, 6);
          this.emit(p.x, p.y, "#ff7043", 24);
        } else if (p.kind === "magnet") {
          this.magnetTimer = 6.0;
          this.show("🧲 SNACK MAGNET ACTIVATED!");
          this.addFloatingText(p.x, p.y - 16, "🧲 SNACK MAGNET!", "#00e5ff", 22);
          this.addShockwave(p.x, p.y, 60, "#00e5ff", 5);
          this.renderer.shake = Math.max(this.renderer.shake, 5);
          this.emit(p.x, p.y, "#18ffff", 24);
        }
      }
    }
    this.powerUps = this.powerUps.filter((p) => !p.collected);
  }

  private updateMagnetPull(dt: number): void {
    if (this.magnetTimer <= 0) return;
    for (const snack of this.snacks) {
      if (snack.collected) continue;
      const dx = this.player.x - snack.x;
      const dy = this.player.y - snack.y;
      const d = Math.hypot(dx, dy);
      if (d < 250 && d > 0.001) {
        const pullSpeed = (1 - d / 250) * 440 + 160;
        snack.x += (dx / d) * pullSpeed * dt;
        snack.y += (dy / d) * pullSpeed * dt;
      }
    }
  }

  private resolvePlayerRam(bot: SecurityBot): void {
    bot.state = "disabled";
    bot.disabled = 1.2;
    this.botCrashes++;
    this.audio.ramSmash();
    this.renderer.shake = Math.max(this.renderer.shake, 12);
    this.addShockwave(bot.x, bot.y, 70, "#ff5722", 5.5);
    this.emit(bot.x, bot.y, "#ffab40", 24);
    this.awardMischief(200, "RAM SMASH!", bot.x, bot.y, "#ff5722");
  }

  private updateEncounters(dt: number): void {
    for (const bot of this.bots) {
      if (bot.state !== "active") continue;
      const current = this.encounters.get(bot.id) ?? { botId: bot.id, inside: false, minDistance: Infinity, cooldown: 0 };
      current.cooldown = Math.max(0, current.cooldown - dt);
      const d = distance(this.player.x, this.player.y, bot.x, bot.y);
      const inner = this.player.radius + bot.radius;
      const outer = inner + 48;
      if (!current.inside && current.cooldown === 0 && d > inner && d < outer) {
        current.inside = true;
        current.minDistance = d;
      }
      if (current.inside) {
        current.minDistance = Math.min(current.minDistance, d);
        if (d >= outer) {
          current.inside = false;
          current.cooldown = 2;
          if (current.minDistance < inner + 34) {
            this.nearMisses++;
            this.awardMischief(50, "SQUEAKED BY!", this.player.x, this.player.y, "#66f4cb");
            this.audio.tone(780, 0.12, "sine", 0.075);
            this.emit(this.player.x, this.player.y, "#66f4cb", 12);
            this.renderer.shake = Math.max(this.renderer.shake, 3);
          }
        }
      }
      this.encounters.set(bot.id, current);
    }
  }

  private multiplier(): number {
    return Math.min(5, 1 + Math.floor(this.snackStreak / 5));
  }

  private mischiefFactor(): number {
    return Math.min(3, 1 + Math.floor(Math.max(0, this.mischiefCount - 1) / 2) * 0.5);
  }

  private awardMischief(base: number, label: string, x: number, y: number, color: string): void {
    this.mischiefCount = this.mischiefTimer > 0 ? Math.min(9, this.mischiefCount + 1) : 1;
    this.mischiefTimer = 3;
    const points = Math.round(base * this.multiplier() * this.scoreFactor() * this.mischiefFactor() * this.dev.scoreMultiplier);
    this.score += points;
    this.show(`${label} +${points}`);
    this.emit(x, y, color, 10);
    this.addFloatingText(x, y - 16, `${label} +${points}`, color, 18);
  }

  private botCap(): number {
    return Math.min(6, 1 + Math.floor(this.time / 14));
  }

  private scoreFactor(): number {
    return this.frenzyTimer > 0 ? 2 : 1;
  }

  private snackPoints(kind: Snack["kind"]): number {
    return kind === "popcorn" ? 25 : kind === "donut" ? 150 : 75;
  }

  private difficulty(): { playerSpeed: number; botSpeed: number } {
    if (this.time >= 75) return { playerSpeed: 1.15, botSpeed: 1.3 };
    if (this.time >= 50) return { playerSpeed: 1.13, botSpeed: 1.26 };
    if (this.time >= 30) return { playerSpeed: 1.1, botSpeed: 1.2 };
    if (this.time >= 15) return { playerSpeed: 1.05, botSpeed: 1.1 };
    return { playerSpeed: 1, botSpeed: 1 };
  }

  private createLandmarks(): Landmark[] {
    const kinds: Landmark["kind"][] = ["booth", "truck", "planter"];
    const radiusByKind: Record<Landmark["kind"], number> = { booth: 34, truck: 32, planter: 30 };

    // 4 balanced quadrants with guaranteed perimeter highway clearance (170+ units from walls)
    const anchors = [
      { x: 260, y: 260 },
      { x: 640, y: 260 },
      { x: 260, y: 640 },
      { x: 640, y: 640 },
    ];

    // Shuffle anchor locations so landmarks vary each run
    for (let i = anchors.length - 1; i > 0; i--) {
      const j = Math.floor(this.random.next() * (i + 1));
      const temp = anchors[i]!;
      anchors[i] = anchors[j]!;
      anchors[j] = temp;
    }

    // 4th quadrant anchor is designated for the Sweeper Cart event
    this.sweeperAnchor = { ...anchors[3]! };

    const blockers: Landmark[] = [];
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i]!;
      const radius = radiusByKind[kind];
      const anchor = anchors[i]!;
      const x = anchor.x + this.random.between(-25, 25);
      const y = anchor.y + this.random.between(-25, 25);
      blockers.push({ x, y, radius, kind });
    }
    return blockers;
  }

  private resolveLandmarkCrashes(): void {
    for (const bot of this.bots) {
      if (bot.state === "active") {
        for (const landmark of this.landmarks) {
          if (distance(bot.x, bot.y, landmark.x, landmark.y) < bot.radius + landmark.radius) {
            bot.state = "disabled";
            bot.disabled = 0.8;
            this.botCrashes++;
            this.awardMischief(135, "BLOCKER BASH!", bot.x, bot.y, "#ffcf57");
            this.audio.collect(true);
            this.emit(bot.x, bot.y, "#ffcf57", 20);
            this.renderer.shake = Math.max(this.renderer.shake, 9);
            this.addShockwave(bot.x, bot.y, 56, "#ffcf57", 4.5);
            break;
          }
        }
      }
    }
  }

  private end(): void {
    this.state = "GAME_OVER";
    this.audio.crash();
    this.audio.stopMusic();
    this.renderer.shake = 20;
    this.emit(this.player.x, this.player.y, "#ffd65a", 34);
    const awards: string[] = [];
    if (this.nearMisses >= 5) awards.push("FIVE CLOSE CALLS");
    if (this.botCrashes) awards.push("OUTSMARTER");
    if (this.bestRunStreak >= 10) awards.push("SNACK MASTER");
    if (this.donutCollected) awards.push("GOLDEN DONUT");
    if (this.bagCollected) awards.push("SNACK FRENZY");
    if (this.time >= 60) awards.push("MIDNIGHT SURVIVOR");
    const outcome = this.save.record(Math.floor(this.score), this.bestRunStreak, this.time, awards, this.dev.practice);
    if (!this.dev.practice) {
      this.platform?.sendScore?.(Math.floor(this.score));
    }
    must("final-score").textContent = String(Math.floor(this.score));
    must("final-best").textContent = String(this.save.data.bestScore);
    must("final-streak").textContent = String(this.bestRunStreak);
    must("final-near").textContent = String(this.nearMisses);
    must("menu-best").textContent = String(this.save.data.bestScore);
    const menuTrophies = document.getElementById("menu-trophy-count");
    if (menuTrophies) menuTrophies.textContent = `${this.save.data.achievements.length}/6`;
    must("result-title").textContent = outcome.best ? "NEW BEST!" : "SNACK SNATCHED!";
    must("achievement").textContent = outcome.achievement
      ? `ACHIEVEMENT: ${outcome.achievement}`
      : this.dev.practice
      ? "PRACTICE RUN — RECORDS UNCHANGED"
      : "";
    this.hud.classList.add("hidden");
    this.over.classList.remove("hidden");
  }

  private emit(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.random.between(0, TAU);
      const speed = this.random.between(30, 145);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: this.random.between(0.35, 0.8),
        max: 0.8,
        size: this.random.between(2, 6),
        color,
      });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updateHud(multiplier: number): void {
    this.scoreEl.textContent = String(Math.floor(this.score));
    this.streakEl.innerHTML = `${this.snackStreak} <i>×${multiplier}</i>`;
    this.timerEl.style.transform = `scaleX(${this.streakTimer / 5})`;
    const frenzy = must("frenzy");
    frenzy.classList.toggle("hidden", this.frenzyTimer === 0);
    frenzy.innerHTML = `SNACK FRENZY <strong>×2 ${this.frenzyTimer.toFixed(1)}s</strong>`;
    const mischief = must("mischief");
    mischief.classList.toggle("hidden", this.mischiefTimer === 0 || this.mischiefCount < 2);
    mischief.innerHTML = `MISCHIEF <strong>×${this.mischiefFactor().toFixed(1)} ${this.mischiefTimer.toFixed(1)}s</strong>`;
    const difficulty = this.difficulty();
    const activeBots = this.bots.filter((bot) => bot.state === "active");
    must("runtime-player-speed").textContent = String(Math.round(this.player.speed * difficulty.playerSpeed));
    must("runtime-bot-speed").textContent = String(Math.round((activeBots[0]?.speed ?? 115) * difficulty.botSpeed));
    must("runtime-bot-active").textContent = String(activeBots.length);
    must("runtime-bot-cap").textContent = String(this.botCap());

    const powerupEl = document.getElementById("powerup");
    if (powerupEl) {
      if (this.sugarRushTimer > 0) {
        powerupEl.classList.remove("hidden", "magnet");
        powerupEl.classList.add("sugar-rush");
        powerupEl.innerHTML = `⚡ SUGAR RUSH <strong>${this.sugarRushTimer.toFixed(1)}s</strong>`;
      } else if (this.magnetTimer > 0) {
        powerupEl.classList.remove("hidden", "sugar-rush");
        powerupEl.classList.add("magnet");
        powerupEl.innerHTML = `🧲 MAGNET <strong>${this.magnetTimer.toFixed(1)}s</strong>`;
      } else {
        powerupEl.classList.add("hidden");
      }
    }
  }

  spawnSugarRush(): void {
    this.dev.practice = true;
    this.sugarRushTimer = 6.0;
    this.show("DEV: SUGAR RUSH ON");
  }

  spawnMagnet(): void {
    this.dev.practice = true;
    this.magnetTimer = 8.0;
    this.show("DEV: MAGNET ON");
  }

  private show(message: string): void {
    this.toast.textContent = message;
    this.toastTimer = 1.1;
    this.toast.classList.add("show");
  }

  private render(time: number): void {
    this.renderer.frame(
      time,
      this.player,
      this.bots,
      this.snacks,
      this.particles,
      this.landmarks,
      this.carousel,
      this.time,
      this.streakTimer,
      this.state,
      this.skidMarks,
      this.shockwaves,
      this.floatingTexts,
      this.frenzyTimer,
      this.powerUps,
      this.sugarRushTimer,
      this.magnetTimer
    );
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const wrap = (angle: number): number => (angle + Math.PI) % TAU - Math.PI;
const angleTo = (x: number, y: number, targetX: number, targetY: number): number => Math.atan2(targetY - y, targetX - x);
const angleDifference = (target: number, current: number): number => wrap(target - current);
const distance = (x: number, y: number, targetX: number, targetY: number): number => Math.hypot(targetX - x, targetY - y);
const sweptDistance = (a: PlayerCart, b: SecurityBot): number =>
  Math.min(distance(a.x, a.y, b.x, b.y), distance(a.previousX, a.previousY, b.previousX, b.previousY));
function pointSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const divisor = dx * dx + dy * dy;
  const t = divisor ? clamp(((px - ax) * dx + (py - ay) * dy) / divisor, 0, 1) : 0;
  return distance(px, py, ax + dx * t, ay + dy * t);
}
function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}
