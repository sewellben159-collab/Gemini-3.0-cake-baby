
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Direct translation of the Python/TS fitness logic
export const BASES = [0, 1, 2, 3] as const;
export type Base = typeof BASES[number];

export interface ChemStructure {
  seq: Base[];
  orderType: Base[];
  mode: number;               // 0-3  (bottom / top / L / R)
  modulation: number[];       // 4D ±2,4,6,8
  resistance: number;         // +8 or -8
}

const ORDER_TYPES = [...Array(24)].map((_, i) => {
  const p: number[] = [];
  let n = i;
  const used = new Set<number>();
  for (let k = 3; k >= 0; k--) {
    const v = n % (4 - k);
    n = Math.floor(n / (4 - k));
    let cnt = 0, val = 0;
    for (let b = 0; b < 4; b++) {
        if (!used.has(b)) {
            if (cnt === v) {
                val = b;
                break;
            }
            cnt++;
        }
    }
    p.unshift(val);
    used.add(val);
  }
  return p as Base[];
});

export function randomStructure(mode: number = 0): ChemStructure {
  return {
    seq: [],
    orderType: ORDER_TYPES[Math.floor(Math.random() * 24)],
    mode: Math.floor(Math.random() * 4),
    modulation: [2, 4, 6, 8].map(m => Math.random() < 0.5 ? -m : m),
    resistance: Math.random() < 0.5 ? -8 : 8,
  };
}

export function infoDensity(struct: ChemStructure): number {
  if (struct.seq.length < 2) return 0.5;
  
  // Create map of base -> index in orderType
  const pos: Record<number, number> = {};
  struct.orderType.forEach((b, i) => pos[b] = i);
  
  let ordered = 0;
  for (let i = 0; i < struct.seq.length - 1; i++) {
    // Check if pair follows the order type precedence
    if (pos[struct.seq[i]] <= pos[struct.seq[i + 1]]) ordered++;
  }
  
  const g = ordered / (struct.seq.length - 1);
  const d = new Set(struct.seq).size / 4;
  
  // Calculate repetitions
  let repeats = 0;
  for (let i = 1; i < struct.seq.length; i++) {
      if (struct.seq[i] === struct.seq[i-1]) repeats++;
  }
  
  const r = 1 / (1 + repeats);
  return 0.35 * g + 0.25 * d + 0.2 * r + 0.2;
}

export function calculateFitness(struct: ChemStructure): number {
  const dens = infoDensity(struct);
  
  // Compression Bits approximation
  const bits = Math.max(0.5 * struct.seq.length,
    struct.seq.length * 2 - 0.8 * dens * struct.seq.length);
    
  // Cost function based on length and resistance
  // Negative resistance (High Cost) increases the denominator penalty
  const cost = struct.seq.length + 0.5 * Math.abs(struct.resistance < 0 ? 1 : -0.6);
  
  // Fitness formula: Dense info + Compressed + Low Cost = High Fitness
  return 2.0 * dens + 1.2 / (1 + bits) + 0.8 / (1 + cost);
}
