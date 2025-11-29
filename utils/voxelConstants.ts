
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- AGENT SYSTEM COLORS (0-9) ---
export const AGENT_COLORS: Record<number, number> = {
  0: 0xF0F0F0, // White
  1: 0xFFD700, // Gold
  2: 0x1E90FF, // Blue
  3: 0xFFFF00, // Yellow
  4: 0xFF4500, // Red
  5: 0x32CD32, // Green
  6: 0x800080, // Purple
  7: 0xFFA500, // Orange
  8: 0xC0C0C0, // Silver
  9: 0x111111  // Black
};

// Original Palette for backward compat
export const COLORS = {
  DARK: 0x4A3728,
  LIGHT: 0x654321,
  WHITE: 0xF0F0F0,
  GOLD: 0xFFD700,
  BLACK: 0x111111,
  WOOD: 0x3B2F2F,
  GREEN: 0x228B22,
  TALON: 0xE5C100,
  BASE_0: 0xFFD700, 
  BASE_1: 0x1E90FF,
  BASE_2: 0xFF4500, 
  BASE_3: 0x32CD32, 
  DEAD: 0x555555,
  HF_REPLICATING: 0x00FFAA,
  HF_DOCKED: 0xFFFF00,
  HF_MISMATCH: 0xFF0055,
  HF_INERT: 0x555555,
  INTERFERENCE_PRIMARY: 0x2a0a3b,
  INTERFERENCE_SECONDARY: 0x800020
};

export const CONFIG = {
  VOXEL_SIZE: 1,
  FLOOR_Y: -12,
  BG_COLOR: 0xf0f2f5,
  WORLD_SIZE: 300 // Expanded world for diverse biomes
};

export const EVENTS = {
    NONE: -1,
    SOLAR_FLARE: 0,
    ICE_AGE: 1,
    TOXIC_BLOOM: 2,
    VOID_STORM: 3
};

export const EVENT_NAMES = ["Solar Max", "Ice Age", "Toxic Era", "Void Storm"];
export const EVENT_COLORS = ["#FFD700", "#1E90FF", "#FF4500", "#32CD32"];
export const ERA_DURATION = 1500; // Slower cycles for continuity

// DNA Visual Helpers
export const GENE_COLORS: Record<string, string> = {
  'A': 'bg-yellow-400',
  'T': 'bg-blue-500',
  'C': 'bg-red-500',
  'G': 'bg-green-500'
};

export const GENE_DESCRIPTIONS: Record<string, string> = {
  'A': 'Architect (Structure)',
  'T': 'Template (Copying)',
  'C': 'Catalyst (Speed)',
  'G': 'Guardian (Defense)'
};

export const TIERS = {
    RAW: 0,
    VOXELOID: 1,
    ORGANELLE: 2,
    CELL: 3,
    TISSUE: 4,
    ORGAN: 5,
    SYSTEM: 6,
    ORGANISM: 7,
    SUPER_ORGANISM: 8,
    GAIA: 9
};

export const TIER_NAMES = [
  "Raw DNA", "Voxeloid", "Organelle", "Cell", "Tissue", "Organ", "System", "Organism", "Super Organism", "Gaia"
];

export interface BiomeEffect {
    metaCost: number; // Multiplier for energy burn (1.0 = normal)
    reproSpeed: number; // Multiplier for reproduction chance
    aggroMod: number; // Modifier for aggression
}

// --- GEMININIMEG BIOMES ---
export const BIOMES = {
    VOLCANIC: { 
        id: 0, name: "Volcanic Rift", color: 0xFF4500, buff: [1, 4, 7],
        effects: { metaCost: 1.5, reproSpeed: 1.5, aggroMod: 1.2 } 
    }, 
    ABYSSAL: { 
        id: 1, name: "Abyssal Trench", color: 0x00008B, buff: [2, 6, 9],
        effects: { metaCost: 0.7, reproSpeed: 0.8, aggroMod: 0.8 } 
    },
    RADIANT: { 
        id: 2, name: "Radiant Forest", color: 0x32CD32, buff: [3, 5, 0],
        effects: { metaCost: 1.0, reproSpeed: 1.2, aggroMod: 0.5 } 
    },
    CRYSTALLINE: { 
        id: 3, name: "Crystal Peaks", color: 0xAADDFF, buff: [0, 8, 2],
        effects: { metaCost: 1.2, reproSpeed: 0.6, aggroMod: 1.0 } 
    }
};

// --- 10 ENVIRONMENTAL LAYERS ---
export const LAYERS = [
    { name: "Bedrock", yMin: -20, yMax: -10, cost: 2.0 },
    { name: "Substrate", yMin: -10, yMax: 0, cost: 1.0 },
    { name: "Understory", yMin: 0, yMax: 10, cost: 1.0 },
    { name: "Canopy", yMin: 10, yMax: 20, cost: 1.2 },
    { name: "Emergent", yMin: 20, yMax: 30, cost: 1.5 },
    { name: "Troposphere", yMin: 30, yMax: 50, cost: 2.0 },
    { name: "Stratosphere", yMin: 50, yMax: 70, cost: 3.0 },
    { name: "Mesosphere", yMin: 70, yMax: 90, cost: 4.0 },
    { name: "Thermosphere", yMin: 90, yMax: 120, cost: 6.0 },
    { name: "Exosphere", yMin: 120, yMax: 999, cost: 10.0 }
];

// --- 24 VARIANTS (0,1,2,3 permutations) ---
export const VARIANTS_24: number[][] = [
  [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
  [1,0,2,3],[1,0,3,2],[1,2,3,0],[1,2,0,3],[1,3,2,0],[1,3,0,2],
  [2,0,1,3],[2,0,3,1],[2,1,3,0],[2,1,0,3],[2,3,1,0],[2,3,0,1],
  [3,0,1,2],[3,0,2,1],[3,1,2,0],[3,1,0,2],[3,2,1,0],[3,2,0,1],
];

// --- LETTER TRAITS (A-Z) ---
// Procedurally generated archetypes
export interface LetterTrait {
    aggression: number; // Feeding efficiency
    defense: number; // Resistance to damage
    metabolism: number; // Energy cost per frame
    reproRate: number; // Spawning speed
    asexual: boolean; // Can spawn without mate
    favoredBiome: number; // ID of biome
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => l !== 'M' && l !== 'W');

export const LETTER_TRAITS: Record<string, LetterTrait> = {};

LETTERS.forEach((l, i) => {
    // Generate distinct traits based on char code
    const seed = l.charCodeAt(0);
    const biomeCount = Object.keys(BIOMES).length;
    
    LETTER_TRAITS[l] = {
        aggression: 0.2 + (seed % 9) * 0.1,
        defense: 0.2 + (seed % 8) * 0.1,
        metabolism: 0.5 + (seed % 6) * 0.1, 
        reproRate: 0.01 + (seed % 5) * 0.01,
        asexual: (seed % 6) === 0, // 1 in 6 chance
        favoredBiome: seed % biomeCount
    };
});

// --- JOB CLASSES for Complex Structures ---
export const JOB_CLASSES = {
    GATHERER: 0,
    HUNTER: 1,
    BUILDER: 2,
    GUARDIAN: 3
};

export const JOB_NAMES = ["Gatherer", "Hunter", "Builder", "Guardian"];
export const JOB_COLORS = [0x32CD32, 0xFF4500, 0xFFD700, 0x1E90FF];


// Polyomino Shapes
export const POLYOMINO_SHAPES = [
    { name: "Domino", points: [[0,0,0], [1,0,0]] },
    { name: "I3", points: [[-1,0,0], [0,0,0], [1,0,0]] },
    { name: "L3", points: [[0,0,0], [1,0,0], [0,1,0]] },
    { name: "I4", points: [[-1,0,0], [0,0,0], [1,0,0], [2,0,0]] },
    { name: "O", points: [[0,0,0], [1,0,0], [0,1,0], [1,1,0]] },
    { name: "T", points: [[-1,0,0], [0,0,0], [1,0,0], [0,1,0]] },
    { name: "L", points: [[0,0,0], [0,1,0], [0,2,0], [1,0,0]] },
    { name: "S", points: [[0,0,0], [1,0,0], [1,1,0], [2,1,0]] },
    { name: "X", points: [[0,0,0], [-1,1,0], [1,1,0], [-1,-1,0], [1,-1,0]] },
    { name: "U", points: [[0,0,0], [2,0,0], [0,1,0], [1,1,0], [2,1,0]] }
];

export const DNA_PALETTE = [COLORS.BASE_0, COLORS.BASE_1, COLORS.BASE_2, COLORS.BASE_3];
export const MOCK_COMMUNITY_SPECIES = [];
export const BEHAVIORS = { PLANT: 0, ANIMAL: 1, HYBRID: 2 };
export const HYPERFOLD_DEFS = {
    0: { label: "A", numerics: "11/199", defaultPath: 0 },
    1: { label: "T", numerics: "19/191", defaultPath: 0 },
    2: { label: "C", numerics: "13/197", defaultPath: 1 },
    3: { label: "G", numerics: "17/193", defaultPath: 1 }
};
export const COMPLEMENTS: Record<number, number> = { 0: 1, 1: 0, 2: 3, 3: 2 };
export const TIER_PROPS = {
    [TIERS.RAW]: { scale: 1, mass: 1, threshold: 3, maxAge: 2000 },
    [TIERS.VOXELOID]: { scale: 2.2, mass: 4, threshold: 3, maxAge: 4000 },
    [TIERS.ORGANELLE]: { scale: 4.5, mass: 12, threshold: 3, maxAge: 6000 },
    [TIERS.CELL]: { scale: 9.0, mass: 40, threshold: 999, maxAge: 8000 },
    [TIERS.TISSUE]: { scale: 15, mass: 100, threshold: 999, maxAge: 10000 },
    [TIERS.ORGAN]: { scale: 25, mass: 200, threshold: 999, maxAge: 12000 },
    [TIERS.SYSTEM]: { scale: 40, mass: 500, threshold: 999, maxAge: 15000 },
    [TIERS.ORGANISM]: { scale: 60, mass: 1000, threshold: 999, maxAge: 20000 },
    [TIERS.SUPER_ORGANISM]: { scale: 100, mass: 5000, threshold: 999, maxAge: 30000 },
    [TIERS.GAIA]: { scale: 200, mass: 10000, threshold: 999, maxAge: 50000 }
};
export const DNA_PERMUTATIONS: Record<string, number[]> = { 'a': [0,1,2,3] };
