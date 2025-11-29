
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { LetterTrait } from './utils/voxelConstants';
import { SimpleBrain } from './utils/neuralNet';
import { ChemStructure } from './utils/chemistry';

export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING',
  LIFE_SIMULATION = 'LIFE_SIMULATION'
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
  type?: number; // 0-3 for DNA base
}

export interface Biome {
    id: number;
    name: string;
    color: number;
    buff: number[];
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  type: number; // 0-3 base or 0-9 agent color ID
  
  // Agent Properties (The "Gemininimeg" Core)
  letter: string; // A-Z
  variant: number[]; // [0,1,2,3] permutation
  gender: number; // 0=M, 1=W
  traits: LetterTrait;
  jobClass: number; // 0=Gatherer, 1=Hunter, 2=Builder, 3=Guardian
  
  // Environment State
  currentBiomeId: number;
  currentLayerId: number;

  isBonded: boolean;
  groupId: number;
  tier: number; // 0-9
  energy: number;
  behavior: number;
  
  // Chemistry Engine Props
  chemStructure: ChemStructure;
  chemFitness: number; // Cached fitness
  
  // Legacy/Visual Props (keeping for compatibility with UI constants)
  modulation: number;
  path: number;
  numerics: string;
  hyperfoldStatus: string;

  isInterference: boolean;
  shapeType?: string;
  
  age: number;
  maxAge: number;

  structGene: string;
  interactGene: string;
  
  // NEAT / DEAP Brain
  brain?: SimpleBrain;
  lastBrainOutput?: number[]; // For visualization [MoveX, MoveZ, Aggro, Mate]

  vx: number; vy: number; vz: number;
  rx: number; ry: number; rz: number;
  rvx: number; rvy: number; rvz: number;
}

export interface Species {
    id: string; // Unique ID
    name: string;
    letter: string;
    variant: number[];
    structGene: string;
    interactGene: string;
    traits: LetterTrait;
    tier: number;
    discoveredBy: string;
    environment: string;
    timestamp: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export interface SavedModel {
  name: string;
  data: VoxelData[];
  baseModel?: string;
}
