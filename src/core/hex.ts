import type { HexCoord } from '../types';

export class Hex {
  public q: number;
  public r: number;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
  }

  static fromCoord(coord: HexCoord): Hex {
    return new Hex(coord.q, coord.r);
  }

  get s(): number {
    return -this.q - this.r;
  }

  equals(other: Hex): boolean {
    return this.q === other.q && this.r === other.r;
  }

  add(other: Hex): Hex {
    return new Hex(this.q + other.q, this.r + other.r);
  }

  subtract(other: Hex): Hex {
    return new Hex(this.q - other.q, this.r - other.r);
  }

  distance(other: Hex): number {
    const vec = this.subtract(other);
    return (Math.abs(vec.q) + Math.abs(vec.q + vec.r) + Math.abs(vec.r)) / 2;
  }

  neighbors(): Hex[] {
    return HEX_DIRECTIONS.map(dir => this.add(dir));
  }

  toPixel(size: number = 30): { x: number; y: number } {
    const x = size * (3/2 * this.q);
    const y = size * (Math.sqrt(3)/2 * this.q + Math.sqrt(3) * this.r);
    return { x, y };
  }

  static fromPixel(x: number, y: number, size: number = 30): Hex {
    const q = (2/3 * x) / size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
    return hexRound(q, r);
  }

  toString(): string {
    return `(${this.q}, ${this.r})`;
  }
}

const HEX_DIRECTIONS = [
  new Hex(1, 0), new Hex(1, -1), new Hex(0, -1),
  new Hex(-1, 0), new Hex(-1, 1), new Hex(0, 1)
];

function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return new Hex(rq, rr);
}

export function hexGridRectangle(width: number, height: number): Hex[] {
  const hexes: Hex[] = [];
  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < width - rOffset; q++) {
      hexes.push(new Hex(q, r));
    }
  }
  return hexes;
}

export function hexGridRadius(center: Hex, radius: number): Hex[] {
  const results: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push(center.add(new Hex(q, r)));
    }
  }
  return results;
}

export function getNeighbors(coord: HexCoord): HexCoord[] {
  const hex = new Hex(coord.q, coord.r);
  return hex.neighbors().map(h => ({ q: h.q, r: h.r }));
}

export function areAdjacent(a: HexCoord, b: HexCoord): boolean {
  const hexA = new Hex(a.q, a.r);
  const hexB = new Hex(b.q, b.r);
  return hexA.distance(hexB) === 1;
}