export class AudioManager {
  private ctx?: AudioContext;
  private allowed = true;
  private muted = false;
  private masterGain?: GainNode;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  private noiseBuffer?: AudioBuffer;

  // BGM scheduler state
  private isMusicPlaying = false;
  private musicIntervalId?: number;
  private currentStep = 0;
  private nextStepTime = 0;
  private readonly tempo = 132; // BPM
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadSeconds = 0.12;

  constructor() {
    this.muted = localStorage.getItem("midnight-munch-muted") === "true";
  }

  unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted || !this.allowed ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Generate 1-second white noise buffer for percussive hits
      const bufferSize = Math.floor(this.ctx.sampleRate);
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem("midnight-munch-muted", String(muted));
    } catch {
      // LocalStorage fallback
    }
    this.applyVolume();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setAllowed(value: boolean): void {
    this.allowed = value;
    this.applyVolume();
  }

  private applyVolume(): void {
    if (this.ctx && this.masterGain) {
      const target = this.muted || !this.allowed ? 0 : 1;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
    }
  }

  // --- Sound Effects ---

  tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.07): void {
    if (!this.allowed || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const volume = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.7), now + duration);
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(volume).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  jump(): void {
    this.tone(430, 0.11, "square", 0.045);
  }

  collect(rare = false): void {
    this.tone(rare ? 940 : 680, rare ? 0.28 : 0.16, "sine", 0.08);
  }

  crash(): void {
    this.tone(120, 0.32, "sawtooth", 0.08);
    // Noise crash rumble
    if (this.ctx && this.sfxGain && this.noiseBuffer && !this.muted) {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(filter).connect(gain).connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.35);
    }
  }

  powerup(): void {
    if (!this.allowed || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.09, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.18);
    });
  }

  ramSmash(): void {
    if (!this.allowed || !this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.2, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(filter).connect(nGain).connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.22);
    }
  }

  // --- Procedural BGM: Carnival Chiptune Chase ---

  startMusic(): void {
    this.unlock();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.currentStep = 0;
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      }
    }
    this.musicIntervalId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  stopMusic(): void {
    if (!this.isMusicPlaying) return;
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== undefined) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = undefined;
    }
    // Quick fade out
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    }
  }

  pauseMusic(): void {
    if (this.musicIntervalId !== undefined) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = undefined;
    }
  }

  resumeMusic(): void {
    if (this.isMusicPlaying && this.musicIntervalId === undefined && this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
      this.musicIntervalId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    }
  }

  private scheduler(): void {
    if (!this.ctx || !this.isMusicPlaying) return;
    const secondsPerStep = (60 / this.tempo) / 4; // 16th note step
    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadSeconds) {
      this.scheduleStep(this.currentStep, this.nextStepTime, secondsPerStep);
      this.nextStepTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop (16 steps * 4 bars)
    }
  }

  private scheduleStep(step: number, time: number, stepDuration: number): void {
    if (!this.ctx || !this.musicGain) return;

    // 1. Bassline (Punchy triangle wave)
    const bassNote = BASS_LINE[step];
    if (bassNote !== undefined && bassNote > 0) {
      this.playBassNote(bassNote, time, stepDuration * 0.88);
    }

    // 2. Carnival Calliope Lead / Arpeggio (Warm square/pulse wave)
    const leadNote = LEAD_LINE[step];
    if (leadNote !== undefined && leadNote > 0) {
      this.playLeadNote(leadNote, time, stepDuration * 0.72);
    }

    // 3. Rhythm & Percussion
    // Kick on steps 0, 8, 16, 24, 32, 40, 48, 56 (quarter notes) + syncopations on 10, 26, 42, 58
    if (step % 8 === 0 || step % 16 === 10) {
      this.playKick(time);
    }

    // Snare / Clap on beats 2 & 4 (steps 4, 12, 20, 28, 36, 44, 52, 60)
    if (step % 8 === 4) {
      this.playSnare(time);
    }

    // Crisp Hi-hat on every off-beat 16th note
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 3);
    }
  }

  private playBassNote(freq: number, time: number, duration: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter).connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private playLeadNote(freq: number, time: number, duration: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Warm chiptune pulse sound
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + duration);

    gain.gain.setValueAtTime(0.065, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter).connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.07);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playSnare(time: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    // Tonal snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.06);
    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.connect(oscGain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.06);

    // Noise body
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(1.5, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.13, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(filter).connect(noiseGain).connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.1);
  }

  private playHiHat(time: number, accent: boolean): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    const vol = accent ? 0.06 : 0.035;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter).connect(gain).connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.035);
  }
}

// Frequency constants (Hz)
const D1 = 36.71;
const F1 = 43.65;
const G1 = 49.00;
const A1 = 55.00;
const Bb1 = 58.27;
const C2 = 65.41;
const Cs2 = 69.30;
const D2 = 73.42;
const E2 = 82.41;
const F2 = 87.31;
const G2 = 98.00;
const A2 = 110.00;

const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const G4 = 392.00;
const A4 = 440.00;
const Bb4 = 466.16;
const C5 = 523.25;
const Cs5 = 554.37;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;

// 64-step (4 bars x 16 steps) Walking Bassline in D minor
// Bar 1: Dm | Bar 2: Bb | Bar 3: Gm | Bar 4: A7
const BASS_LINE: number[] = [
  // Bar 1 (Dm)
  D2, 0, D2, 0, F2, 0, D2, 0, G2, 0, F2, 0, E2, 0, C2, 0,
  // Bar 2 (Bb)
  Bb1, 0, Bb1, 0, D2, 0, Bb1, 0, F2, 0, D2, 0, C2, 0, Bb1, 0,
  // Bar 3 (Gm)
  G1, 0, G1, 0, Bb1, 0, G1, 0, D2, 0, Bb1, 0, G1, 0, F1, 0,
  // Bar 4 (A7)
  A1, 0, A1, 0, Cs2, 0, E2, 0, G2, 0, E2, 0, Cs2, 0, A1, 0,
];

// 64-step Carnival Arpeggio & Lead in D minor
const LEAD_LINE: number[] = [
  // Bar 1
  A4, F4, D4, F4, A4, D5, C5, A4, F4, G4, A4, 0, F4, E4, D4, 0,
  // Bar 2
  D5, Bb4, F4, Bb4, D5, F5, E5, D5, Bb4, C5, D5, 0, Bb4, A4, G4, 0,
  // Bar 3
  Bb4, G4, D4, G4, Bb4, D5, C5, Bb4, G4, A4, Bb4, 0, D5, C5, Bb4, 0,
  // Bar 4
  Cs5, A4, E4, A4, Cs5, E5, D5, Cs5, A4, Bb4, Cs5, 0, E5, D5, Cs5, 0,
];
