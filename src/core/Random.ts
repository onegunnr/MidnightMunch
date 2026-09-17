export class Random {
  constructor(private value = (Date.now() >>> 0) || 1) {}
  next(): number { this.value = (this.value * 1664525 + 1013904223) >>> 0; return this.value / 4294967296; }
  between(min: number, max: number): number { return min + this.next() * (max - min); }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.next() * items.length)]!; }
}
