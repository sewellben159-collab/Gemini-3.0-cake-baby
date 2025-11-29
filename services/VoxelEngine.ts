
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData, Species } from '../types';
import { CONFIG, COLORS, AGENT_COLORS, VARIANTS_24, LETTER_TRAITS, BIOMES, LAYERS, EVENTS, EVENT_COLORS, EVENT_NAMES, TIERS, TIER_PROPS, BEHAVIORS, ERA_DURATION, POLYOMINO_SHAPES, HYPERFOLD_DEFS, COMPLEMENTS, TIER_NAMES, JOB_CLASSES, JOB_COLORS, LetterTrait } from '../utils/voxelConstants';
import { SimpleBrain } from '../utils/neuralNet';
import { randomStructure, calculateFitness, BASES } from '../utils/chemistry';

const MAX_VOXELS = 1500; // Increased for continuous flow
const PARTICLE_COUNT = 1200;

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private instanceMesh: THREE.InstancedMesh | null = null;
  private femaleMesh: THREE.InstancedMesh | null = null;
  
  private maleMap: number[] = [];
  private femaleMap: number[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private onEventChange?: (event: number) => void;
  private onSpeciesDiscovery?: (s: Species) => void;
  private onVoxelSelect?: (v: SimulationVoxel | null) => void;
  
  private animationId: number = 0;
  
  private currentEvent: number = EVENTS.NONE;
  private nextEvent: number = EVENTS.NONE;
  private eventProgress: number = 0; // 0.0 to 1.0 interpolation between seasons
  private eventPhaseTimer: number = 0;
  private frameCount: number = 0;
  private isAutoCycle: boolean = false;
  
  private particleSystem: THREE.Points | null = null;
  private particlePositions: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private particleVelocities: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  
  private sphereFloor: THREE.Group | null = null;
  private currentZoomTier: number = 0; // 0=Micro, 1=Meso, 2=Macro

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000814);
    this.scene.fog = new THREE.FogExp2(0x000814, 0.001);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.camera.position.set(50, 60, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5; // Slightly faster to show planetary motion
    this.controls.target.set(0, 10, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 1200;

    // --- MOUSE MAPPING ---
    this.controls.mouseButtons = {
        LEFT: null as any, // Disable camera interaction on Left Click (reserved for select)
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    this.createPlanetarySphere();
    this.initParticles();

    // Standard click handled by engine, but drag box is handled by App
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));

    this.animate = this.animate.bind(this);
    this.animate();
  }

  // --- PLANETARY SPHERE ENVIRONMENT ---
  private createPlanetarySphere() {
      this.sphereFloor = new THREE.Group();
      const radius = 600; // Larger world
      
      // 1. Core Ocean Sphere
      const geo = new THREE.SphereGeometry(radius, 128, 128);
      const mat = new THREE.MeshStandardMaterial({ 
          color: 0x2244aa, 
          roughness: 0.3,
          metalness: 0.2
      });
      const core = new THREE.Mesh(geo, mat);
      core.receiveShadow = true;
      this.sphereFloor.add(core);

      // 2. Life/Land Patches (Inner Glow)
      const patchGeo = new THREE.SphereGeometry(radius + 0.5, 64, 64);
      // Generate noise map for patches
      const colors: number[] = [];
      const pos = patchGeo.attributes.position;
      for(let i=0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const noise = Math.sin(x * 0.02) + Math.cos(z * 0.02) * Math.sin(y * 0.02);
          
          if (noise > 0.5) {
               colors.push(0.2, 0.8, 0.4); // Green
          } else if (noise > 0.2) {
               colors.push(0.8, 0.6, 0.2); // Sand
          } else {
               colors.push(0, 0, 0); // Transparent black
          }
      }
      patchGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const patchMat = new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending
      });
      const patches = new THREE.Mesh(patchGeo, patchMat);
      this.sphereFloor.add(patches);

      // Position top of sphere near 0
      this.sphereFloor.position.y = -radius + CONFIG.FLOOR_Y; 
      this.scene.add(this.sphereFloor);
      
      // Add Layer Indicators (Atmospheric rings)
      LAYERS.forEach((l, i) => {
          if (i === 0) return;
          const ringRadius = 150 + (i * 15);
          const ringGeo = new THREE.TorusGeometry(ringRadius, 0.2, 16, 100);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = l.yMin; 
          this.scene.add(ring);
      });
  }
  
  // This handles simple clicks. Drag logic is passed in from App via selectBox
  private onPointerDown(event: PointerEvent) {
      if (this.state !== AppState.LIFE_SIMULATION || event.button !== 0) return;
      
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const objectsToCheck: THREE.Object3D[] = [];
      if (this.instanceMesh) objectsToCheck.push(this.instanceMesh);
      if (this.femaleMesh) objectsToCheck.push(this.femaleMesh);
      
      const intersections = this.raycaster.intersectObjects(objectsToCheck);
      if (intersections.length > 0) {
          const hit = intersections[0];
          const mesh = hit.object as THREE.InstancedMesh;
          const instanceId = hit.instanceId;
          if (instanceId !== undefined) {
              let voxelIndex = -1;
              if (mesh === this.instanceMesh) voxelIndex = this.maleMap[instanceId];
              else if (mesh === this.femaleMesh) voxelIndex = this.femaleMap[instanceId];
              
              if (voxelIndex !== -1 && this.voxels[voxelIndex]) {
                  if (this.onVoxelSelect) this.onVoxelSelect(this.voxels[voxelIndex]);
                  return;
              }
          }
      }
      if (this.onVoxelSelect) this.onVoxelSelect(null);
  }

  public selectBox(rect: { left: number, top: number, width: number, height: number }) {
      if (!this.instanceMesh || !this.femaleMesh) return;
      
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = (cx / window.innerWidth) * 2 - 1;
      const y = -(cy / window.innerHeight) * 2 + 1;
      
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
      
      const selected: SimulationVoxel[] = [];
      const tempVec = new THREE.Vector3();
      
      this.voxels.forEach(v => {
          tempVec.set(v.x, v.y, v.z);
          tempVec.project(this.camera);
          const px = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
          const py = -(tempVec.y * 0.5 - 0.5) * window.innerHeight;
          
          if (px >= rect.left && px <= rect.left + rect.width &&
              py >= rect.top && py <= rect.top + rect.height) {
              selected.push(v);
          }
      });

      if (selected.length > 0 && this.onVoxelSelect) {
           selected.sort((a,b) => {
               const distA = Math.pow(a.x - this.camera.position.x, 2) + Math.pow(a.y - this.camera.position.y, 2) + Math.pow(a.z - this.camera.position.z, 2);
               const distB = Math.pow(b.x - this.camera.position.x, 2) + Math.pow(b.y - this.camera.position.y, 2) + Math.pow(b.z - this.camera.position.z, 2);
               return distA - distB;
           });
           const representative = {...selected[0], _groupSize: selected.length, _group: selected};
           this.onVoxelSelect(representative as any);
      }
  }
  
  private initParticles() {
      const geo = new THREE.BufferGeometry();
      for(let i=0; i<PARTICLE_COUNT; i++) {
          this.particlePositions[i*3] = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
          this.particlePositions[i*3+1] = (Math.random() * 80) + CONFIG.FLOOR_Y;
          this.particlePositions[i*3+2] = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
          this.particleVelocities[i*3] = 0;
          this.particleVelocities[i*3+1] = 0;
          this.particleVelocities[i*3+2] = 0;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0 });
      this.particleSystem = new THREE.Points(geo, mat);
      this.scene.add(this.particleSystem);
  }
  
  public setEventCallback(cb: (event: number) => void) { this.onEventChange = cb; }
  public setSpeciesDiscoveryCallback(cb: (s: Species) => void) { this.onSpeciesDiscovery = cb; }
  public setVoxelSelectCallback(cb: (v: SimulationVoxel | null) => void) { this.onVoxelSelect = cb; }

  public triggerEvent(evt: number) {
      this.nextEvent = evt;
      this.eventProgress = 0;
  }
  
  public setAutoCycle(enabled: boolean) { this.isAutoCycle = enabled; }
  public setAutoRotate(enabled: boolean) { this.controls.autoRotate = enabled; }

  private updateEnvironmentVisuals() {
      if (!this.particleSystem) return;
      const mat = this.particleSystem.material as THREE.PointsMaterial;
      const c1 = new THREE.Color(this.currentEvent === EVENTS.NONE ? 0x000814 : EVENT_COLORS[this.currentEvent]);
      const c2 = new THREE.Color(this.nextEvent === EVENTS.NONE ? 0x000814 : EVENT_COLORS[this.nextEvent]);
      const currentColor = c1.lerp(c2, this.eventProgress);
      
      this.scene.background = currentColor.clone().lerp(new THREE.Color(0x000814), 0.7);
      if (this.scene.fog) {
          (this.scene.fog as THREE.FogExp2).color.copy(this.scene.background);
      }
      if (this.nextEvent !== EVENTS.NONE || this.currentEvent !== EVENTS.NONE) {
          mat.color.set(currentColor);
          mat.opacity = 0.5;
      } else {
          mat.opacity = 0;
      }
  }

  public loadInitialModel(data: VoxelData[], mode: AppState = AppState.STABLE) {
    if (mode === AppState.LIFE_SIMULATION) {
        if (this.state !== AppState.LIFE_SIMULATION) {
            this.voxels = [];
        }
        if (this.voxels.length < 50) {
             const spawnCount = 800; // Increased initial population
             for (let i = 0; i < spawnCount; i++) {
                this.spawnRandomAgent();
             }
        }
    } else {
        this.createVoxels(data);
    }
    
    this.onCountChange(this.voxels.length);
    this.state = mode;
    this.onStateChange(this.state);
    this.draw();
  }
  
  private spawnRandomAgent() {
      const letters = Object.keys(LETTER_TRAITS);
      const letter = letters[Math.floor(Math.random() * letters.length)];
      const variantIdx = Math.floor(Math.random() * VARIANTS_24.length);
      const traits = LETTER_TRAITS[letter];
            
      const range = CONFIG.WORLD_SIZE / 2; // Spread out more
      let x = (Math.random() - 0.5) * range * 2;
      let z = (Math.random() - 0.5) * range * 2;
      
      // Biome placement
      if (traits.favoredBiome === 0) { x = Math.abs(x); z = Math.abs(z); } 
      else if (traits.favoredBiome === 1) { x = Math.abs(x); z = -Math.abs(z); } 
      else if (traits.favoredBiome === 2) { x = -Math.abs(x); z = Math.abs(z); }
      else if (traits.favoredBiome === 3) { x = -Math.abs(x); z = -Math.abs(z); }
            
      const y = CONFIG.FLOOR_Y + 10 + Math.random() * 80;
      const colorId = Math.floor(Math.random() * 10);
      const id = this.voxels.length > 0 ? Math.max(...this.voxels.map(v=>v.id)) + 1 : 0;
            
      this.voxels.push(this.createAgentVoxel(id, x, y, z, letter, variantIdx, colorId));
  }
  
  private spawnResourceRain() {
      if (this.voxels.length < MAX_VOXELS) {
          const spawnRate = 4; // Higher influx for larger world
          for(let i=0; i<spawnRate; i++) {
              this.spawnRandomAgent();
          }
      }
  }

  private createAgentVoxel(id: number, x: number, y: number, z: number, letter: string, variantIdx: number, colorId: number): SimulationVoxel {
      const traits = LETTER_TRAITS[letter];
      const gender = Math.random() > 0.5 ? 1 : 0;
      const type = colorId;
      const color = new THREE.Color(AGENT_COLORS[type]);
      
      // Determine Job Class based on traits
      let jobClass = JOB_CLASSES.GATHERER;
      if (traits.aggression > 0.7) jobClass = JOB_CLASSES.HUNTER;
      else if (traits.defense > 0.7) jobClass = JOB_CLASSES.GUARDIAN;
      else if (traits.reproRate > 0.04) jobClass = JOB_CLASSES.BUILDER;

      // Initialize Chemistry Structure
      const chemStructure = randomStructure(Math.floor(Math.random() * 4));
      // Base sequence seeds
      chemStructure.seq.push(Math.floor(Math.random() * 4) as any);
      const chemFitness = calculateFitness(chemStructure);

      // INIT BRAIN
      const brain = new SimpleBrain(5, 4, 4); 

      return {
          id, x, y, z, color, type,
          letter,
          variant: VARIANTS_24[variantIdx],
          gender,
          traits,
          jobClass,
          currentBiomeId: 0,
          currentLayerId: 0,
          isBonded: false, groupId: 0,
          tier: TIERS.RAW,
          energy: 200, 
          behavior: BEHAVIORS.ANIMAL,
          chemStructure,
          chemFitness,
          modulation: (Math.floor(Math.random() * 9) * 2) - 8,
          path: Math.random() > 0.5 ? 0 : 1,
          numerics: "00/000",
          hyperfoldStatus: 'Inert',
          isInterference: false,
          age: 0, maxAge: 3000,
          structGene: VARIANTS_24[variantIdx].join(''),
          interactGene: VARIANTS_24[(variantIdx + 1) % 24].join(''),
          brain,
          lastBrainOutput: [0,0,0,0],
          vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, rvx: Math.random()*0.1, rvy: Math.random()*0.1, rvz: Math.random()*0.1
      };
  }

  private createVoxels(data: VoxelData[]) {
    this.voxels = data.map((v, i) => {
        return this.createAgentVoxel(i, v.x, v.y, v.z, 'A', 0, 0);
    });
    this.createMeshes();
  }

  private createMeshes() {
    this.disposeMeshes();
    const maleGeo = new THREE.BoxGeometry(1, 1, 1);
    const maleMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(maleGeo, maleMat, MAX_VOXELS * 2); 
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    const femaleGeo = new THREE.IcosahedronGeometry(0.6, 0); 
    const femaleMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 }); 
    this.femaleMesh = new THREE.InstancedMesh(femaleGeo, femaleMat, MAX_VOXELS * 2);
    this.femaleMesh.castShadow = true;
    this.femaleMesh.receiveShadow = true;
    this.scene.add(this.femaleMesh);
  }

  private disposeMeshes() {
    if (this.instanceMesh) {
        this.scene.remove(this.instanceMesh);
        this.instanceMesh.geometry.dispose();
        (this.instanceMesh.material as THREE.Material).dispose();
        this.instanceMesh = null;
    }
    if (this.femaleMesh) {
        this.scene.remove(this.femaleMesh);
        this.femaleMesh.geometry.dispose();
        (this.femaleMesh.material as THREE.Material).dispose();
        this.femaleMesh = null;
    }
  }

  private getBiomeAt(x: number, z: number): number {
      const noise = Math.sin(x * 0.02) + Math.cos(z * 0.02) + Math.sin(x * 0.05 + z * 0.05);
      if (noise < -1) return BIOMES.ABYSSAL.id;
      if (noise < 0) return BIOMES.CRYSTALLINE.id;
      if (noise > 1.0) return BIOMES.VOLCANIC.id;
      return BIOMES.RADIANT.id;
  }
  
  private getLayerAt(y: number): number {
      for(let i=0; i<LAYERS.length; i++) {
          if (y >= LAYERS[i].yMin && y < LAYERS[i].yMax) return i;
      }
      return 0;
  }

  private draw() {
    if (!this.instanceMesh || !this.femaleMesh) { this.createMeshes(); return; }

    let maleCount = 0;
    let femaleCount = 0;
    this.maleMap = [];
    this.femaleMap = [];

    const dist = this.camera.position.distanceTo(this.controls.target);
    if (dist < 100) this.currentZoomTier = 0; 
    else if (dist < 300) this.currentZoomTier = 1; 
    else this.currentZoomTier = 2; 

    this.voxels.forEach((v, idx) => {
        if (this.currentZoomTier === 2 && v.tier < TIERS.CELL) return; 
        
        let scale = CONFIG.VOXEL_SIZE * (TIER_PROPS[v.tier]?.scale || 1);
        if (this.currentZoomTier === 2 && v.tier >= TIERS.CELL) {
            scale *= 2.0; 
        }

        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.updateMatrix();
        
        let baseColor = v.color.clone();
        const biomeValues = Object.values(BIOMES);
        const currentBiome = biomeValues.find(b => b.id === v.currentBiomeId);
        
        // Visual indicator of Job Class
        if (v.tier > TIERS.VOXELOID) {
            baseColor = new THREE.Color(JOB_COLORS[v.jobClass]);
        }
        
        if (currentBiome && currentBiome.buff.includes(v.type)) {
            baseColor.offsetHSL(0, 0, 0.2); 
        }

        if (v.hyperfoldStatus === 'Replicating') baseColor.setHex(COLORS.HF_REPLICATING);
        
        if (v.gender === 0) {
            this.instanceMesh!.setMatrixAt(maleCount, this.dummy.matrix);
            this.instanceMesh!.setColorAt(maleCount, baseColor);
            this.maleMap[maleCount] = idx;
            maleCount++;
        } else {
            this.femaleMesh!.setMatrixAt(femaleCount, this.dummy.matrix);
            this.femaleMesh!.setColorAt(femaleCount, baseColor);
            this.femaleMap[femaleCount] = idx;
            femaleCount++;
        }
    });

    this.instanceMesh.count = maleCount;
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;

    this.femaleMesh.count = femaleCount;
    this.femaleMesh.instanceMatrix.needsUpdate = true;
    if (this.femaleMesh.instanceColor) this.femaleMesh.instanceColor.needsUpdate = true;
  }

  public dismantle() {
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.8;
        v.vy = Math.random() * 0.5;
        v.isBonded = false; v.groupId = 0; v.tier = TIERS.RAW;
    });
  }

  public rebuild(targetModel: VoxelData[]) { /* ... */ }
  
  public injectSpecies(s: Species) {
      for (let i = 0; i < 5; i++) {
          const x = (Math.random() - 0.5) * 20;
          const z = (Math.random() - 0.5) * 20;
          const y = CONFIG.FLOOR_Y + 10;
          const id = this.voxels.length > 0 ? Math.max(...this.voxels.map(v=>v.id)) + 1 : 0;
          let variantIdx = VARIANTS_24.findIndex(v => 
              v.length === s.variant.length && v.every((val, idx) => val === s.variant[idx])
          );
          const v = this.createAgentVoxel(id, x, y, z, s.letter, variantIdx === -1 ? 0 : variantIdx, 0);
          v.traits = {...s.traits}; // Clone traits
          this.voxels.push(v);
      }
      this.onCountChange(this.voxels.length);
  }
  
  public injectStrain(struct: string, interact: string) { /* ... */ }
  public updateVoxelGenetics(id: number, struct: string, interact: string) { 
      const v = this.voxels.find(vx => vx.id === id);
      if (v) {
          v.structGene = struct;
          v.interactGene = interact;
          v.brain?.mutate(0.5, 0.5);
      }
  }
  
  // New Gene Lab Function
  public updateVoxelTraits(id: number, traits: Partial<LetterTrait>, jobClass?: number) {
      const v = this.voxels.find(vx => vx.id === id);
      if (v) {
          v.traits = { ...v.traits, ...traits };
          if (jobClass !== undefined) v.jobClass = jobClass;
      }
  }

  public saveSpeciesFromVoxel(id: number, name: string) {
      const v = this.voxels.find(vx => vx.id === id);
      if (v && this.onSpeciesDiscovery) {
          const species: Species = {
              id: crypto.randomUUID(),
              name: name || `Specimen ${v.letter}-${v.id}`,
              letter: v.letter,
              variant: v.variant,
              structGene: v.structGene,
              interactGene: v.interactGene,
              traits: v.traits,
              tier: v.tier,
              discoveredBy: "User",
              environment: EVENT_NAMES[this.currentEvent] || "Stable Era",
              timestamp: Date.now()
          };
          this.onSpeciesDiscovery(species);
      }
  }

  // --- CHEMISTRY & LIFE PHYSICS LOOP ---
  private updateLifePhysics() {
    this.frameCount++;
    if (this.frameCount % 10 === 0) {
        this.spawnResourceRain();
    }
    
    if (this.isAutoCycle) {
        this.eventPhaseTimer++;
        if (this.eventPhaseTimer > ERA_DURATION) {
            this.eventPhaseTimer = 0;
            let next = (this.currentEvent + 1) % 4;
            this.triggerEvent(next);
        }
        if (this.eventProgress < 1.0) {
            this.eventProgress += 0.005;
            this.updateEnvironmentVisuals();
        }
    }
    
    if (this.sphereFloor) {
        this.sphereFloor.rotation.y += 0.0005; 
    }
    
    let deadIndices: number[] = [];
    const sphereCenter = new THREE.Vector3(0, -600 + CONFIG.FLOOR_Y, 0);

    for (let i = 0; i < this.voxels.length; i++) {
        const v = this.voxels[i];
        
        v.currentBiomeId = this.getBiomeAt(v.x, v.z);
        v.currentLayerId = this.getLayerAt(v.y);

        // Biome Effects
        const currentBiomeDef = Object.values(BIOMES).find(b => b.id === v.currentBiomeId);
        const biomeEffects = currentBiomeDef?.effects || { metaCost: 1, reproSpeed: 1, aggroMod: 1 };

        // --- CHEMISTRY GROWTH ---
        if (Math.random() < 0.02) { 
            if (v.chemStructure.seq.length < 50) {
                 v.chemStructure.seq.push(BASES[Math.floor(Math.random() * 4)]);
                 v.chemFitness = calculateFitness(v.chemStructure);
            }
        }
        
        // --- SURVIVAL & METABOLISM ---
        v.age++;
        // Energy Burn: Base * Trait * Biome * Tier
        const burnRate = 0.1 * v.traits.metabolism * biomeEffects.metaCost * (1 + v.tier * 0.5);
        v.energy -= burnRate;

        // Death Logic
        if (v.energy <= 0 || v.age > v.maxAge) {
            deadIndices.push(i);
            continue;
        }

        // --- BRAIN AGENCY ---
        let nearestFoodDist = 999;
        let nearestMateDist = 999;
        let nearestEnemyDist = 999;
        let nearestMateIndex = -1;
        let nearestPreyIndex = -1;

        const sampleCount = 15;
        for (let k=0; k<sampleCount; k++) {
            const ridx = Math.floor(Math.random() * this.voxels.length);
            if (ridx === i) continue;
            const other = this.voxels[ridx];
            const d = Math.sqrt(Math.pow(v.x-other.x,2) + Math.pow(v.y-other.y,2) + Math.pow(v.z-other.z,2));
            
            // Predation: Higher tier eats lower tier, or Hunger > 0.8 eats anything
            if (other.tier < v.tier || (v.traits.aggression > 0.8 && other.tier <= v.tier && d < 5)) {
                if (d < nearestFoodDist) {
                    nearestFoodDist = d;
                    nearestPreyIndex = ridx;
                }
            }
            else if (other.tier === v.tier) {
                if (other.gender !== v.gender) {
                    if (d < nearestMateDist) { nearestMateDist = d; nearestMateIndex = ridx; }
                } else {
                     // Same gender, maybe enemy?
                     if (d < nearestEnemyDist) nearestEnemyDist = d;
                }
            }
        }

        const inputs = [
            v.energy / 200,
            v.age / v.maxAge,
            Math.min(nearestFoodDist, 50) / 50,
            Math.min(nearestMateDist, 50) / 50,
            Math.min(nearestEnemyDist, 50) / 50
        ];

        const outputs = v.brain ? v.brain.activate(inputs) : [0.5, 0.5, 0.5, 0.5];
        v.lastBrainOutput = outputs;

        const moveDirX = (outputs[0] * 2) - 1; 
        const moveDirZ = (outputs[1] * 2) - 1;
        let aggression = outputs[2] * v.traits.aggression * biomeEffects.aggroMod;
        const matingDesire = outputs[3];

        let fx = moveDirX * 0.1; 
        let fy = 0; 
        let fz = moveDirZ * 0.1;

        // Job Class Modifiers
        if (v.jobClass === JOB_CLASSES.HUNTER) { fx *= 1.5; fz *= 1.5; aggression *= 1.2; }
        if (v.jobClass === JOB_CLASSES.GATHERER) { fx *= 0.5; fz *= 0.5; } // Slow drift

        const toCenter = new THREE.Vector3(v.x, v.y, v.z).sub(sphereCenter).normalize().multiplyScalar(-0.02);
        fx += toCenter.x;
        fy += toCenter.y;
        fz += toCenter.z;

        // Predation Interaction
        if (nearestPreyIndex !== -1 && aggression > 0.6 && v.energy < 150) {
             const prey = this.voxels[nearestPreyIndex];
             const dx = prey.x - v.x;
             const dy = prey.y - v.y;
             const dz = prey.z - v.z;
             fx += dx * 0.1; fy += dy * 0.1; fz += dz * 0.1;
             
             if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 1.5) {
                 // Eat
                 v.energy += prey.energy * 0.5;
                 v.chemFitness += 0.1; // Successful hunt buff
                 prey.energy = -10; // Kill prey
             }
        }

        // Mating Interaction
        if (nearestMateIndex !== -1 && matingDesire > 0.6 && v.energy > 80) {
            const mate = this.voxels[nearestMateIndex];
            const dx = mate.x - v.x;
            const dy = mate.y - v.y;
            const dz = mate.z - v.z;
            fx += dx * 0.05; fy += dy * 0.05; fz += dz * 0.05; 
            
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < 1.5) {
                if (this.voxels.length < MAX_VOXELS && Math.random() < 0.05 * biomeEffects.reproSpeed) {
                    this.reproduce(v, mate);
                }
            }
        }
        
        // Asexual Reproduction (Mitosis)
        if (v.traits.asexual && v.energy > 180 && Math.random() < v.traits.reproRate) {
             this.reproduce(v, v); // Self-clone
        }

        v.vx += fx; v.vy += fy; v.vz += fz;
        v.vx *= 0.9; v.vy *= 0.9; v.vz *= 0.9;
        v.x += v.vx; v.y += v.vy; v.z += v.vz;
        
        if (v.y < CONFIG.FLOOR_Y) { v.y = CONFIG.FLOOR_Y; v.vy *= -0.5; }
    }
    
    if (deadIndices.length > 0) {
        deadIndices.sort((a,b) => b-a);
        deadIndices = [...new Set(deadIndices)];
        deadIndices.forEach(idx => this.voxels.splice(idx, 1));
        this.onCountChange(this.voxels.length);
    }
  }
  
  private reproduce(parentA: SimulationVoxel, parentB: SimulationVoxel) {
        let variantIdx = VARIANTS_24.findIndex(va => va.every((val, i) => val === parentA.variant[i]));
        if (variantIdx === -1) variantIdx = 0;

        const child = this.createAgentVoxel(
            Math.max(...this.voxels.map(vv=>vv.id)) + 1,
            parentA.x, parentA.y + 1, parentA.z,
            parentA.letter, variantIdx, parentA.type
        );
        
        // Inherit Traits + Mutation
        child.traits = { ...parentA.traits };
        if (Math.random() < 0.1) child.traits.aggression += (Math.random()-0.5) * 0.1;
        if (Math.random() < 0.1) child.traits.metabolism += (Math.random()-0.5) * 0.1;

        if (parentA.brain && parentB.brain && child.brain) {
            child.brain = SimpleBrain.crossover(parentA.brain, parentB.brain);
            child.brain.mutate(0.1, 0.2); 
        }
        this.voxels.push(child);
        parentA.energy -= 40;
  }

  private updatePhysics() {
      if (this.state === AppState.LIFE_SIMULATION) {
          this.updateLifePhysics();
      } else if (this.state === AppState.DISMANTLING) {
           this.voxels.forEach(v => {
            v.vy -= 0.025;
            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            if (v.y < CONFIG.FLOOR_Y + 0.5) { v.y = CONFIG.FLOOR_Y + 0.5; v.vy *= -0.5; }
        });
      }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    this.draw();
    this.renderer.render(this.scene, this.camera);
  }
  
  public handleResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  public getTierStats() {
      const stats = [0,0,0,0,0,0,0,0,0,0];
      this.voxels.forEach(v => { if (stats[v.tier] !== undefined) stats[v.tier]++; });
      return stats;
  }
  
  public getUniqueColors() { return []; }
  public getJsonData() { return ""; }
  
  public getZoomTier() { return this.currentZoomTier; }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
  }
}
