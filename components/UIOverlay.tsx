
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState } from 'react';
import { AppState, SavedModel, Species, SimulationVoxel } from '../types';
import { BIOMES, LAYERS, GENE_COLORS, GENE_DESCRIPTIONS, TIER_NAMES, JOB_NAMES, JOB_CLASSES } from '../utils/voxelConstants';
import { Box, Bird, Dna, Microscope, Beaker, Globe, Map as MapIcon, Layers, Save, Info, BrainCircuit, Library, Users, Activity, Shield, Zap } from 'lucide-react';
import { infoDensity } from '../utils/chemistry';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  isLifeMode: boolean;
  onDismantle: () => void;
  onRebuild: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onNewScene: (type: 'Eagle') => void;
  onStartLife: () => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
  currentEvent: number;
  tierStats: number[];
  onTriggerEvent: (evt: number) => void;
  discoveredSpecies: Species[];
  onLoadSpecies: (s: Species) => void;
  isAutoCycle: boolean;
  onToggleAutoCycle: () => void;
  selectedVoxel: SimulationVoxel | null;
  onDeselect: () => void;
  onInjectStrain: (struct: string, interact: string) => void;
  onUpdateVoxel: (id: number, struct: string, interact: string) => void;
  onSaveSpecies: (id: number, name: string) => void;
  onOpenCatalog: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  isLifeMode,
  onNewScene,
  onStartLife,
  selectedVoxel,
  onDeselect,
  onSaveSpecies,
  onOpenCatalog
}) => {
  const [speciesName, setSpeciesName] = useState('');
  
  // Gene Visualization Component
  const GeneStrip: React.FC<{ gene: string }> = ({ gene }) => (
      <div className="flex gap-1">
          {gene.split('').map((base, i) => (
              <div key={i} className="group relative">
                  <div className={`w-4 h-6 rounded-sm ${GENE_COLORS[base] || 'bg-gray-400'} border border-black/10`} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                      {GENE_DESCRIPTIONS[base]}
                  </div>
              </div>
          ))}
      </div>
  );

  // Group selection support
  // @ts-ignore
  const isGroup = selectedVoxel?._groupSize !== undefined && selectedVoxel._groupSize > 1;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none overflow-hidden text-sans">
      
      {/* --- Top Left --- */}
      <div className="absolute top-4 left-4 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col gap-2">
              <button onClick={() => onNewScene('Eagle')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-sm">
                  <Box size={16}/> Builder Mode
              </button>
              <button onClick={onStartLife} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200">
                  <Dna size={16}/> Gemininimeg
              </button>
          </div>
          
          {isLifeMode && (
              <div className="mt-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2">
                  <button onClick={onOpenCatalog} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-sm">
                      <Library size={16}/> Species Catalog
                  </button>
                  <div className="text-[10px] text-center text-slate-400 font-bold mt-2 uppercase tracking-wide">
                      Shift + Drag to Select
                  </div>
              </div>
          )}
      </div>

      {/* --- Gene Lab Inspector Panel (Bottom Left) --- */}
      {isLifeMode && selectedVoxel && (
          <div className="absolute bottom-4 left-4 z-50 pointer-events-auto animate-in slide-in-from-left-4">
              <div className="bg-white/95 backdrop-blur shadow-2xl rounded-2xl border-2 border-indigo-100 p-5 w-80 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                          {isGroup ? (
                             <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                <Users size={16} className="text-indigo-500"/> 
                                {/* @ts-ignore */}
                                Group Selection ({selectedVoxel._groupSize})
                             </h3>
                          ) : (
                             <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                <Microscope size={16} className="text-indigo-500"/> Specimen #{selectedVoxel.id}
                             </h3>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                              {TIER_NAMES[selectedVoxel.tier]} • {LAYERS[selectedVoxel.currentLayerId]?.name || "Unknown"}
                          </span>
                      </div>
                      <button onClick={onDeselect} className="text-slate-400 hover:text-slate-600 font-bold px-2">X</button>
                  </div>
                  
                  {/* Archetype & Class */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                       <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                           <span className="block text-[10px] text-slate-400 uppercase font-bold">Archetype</span>
                           <span className="font-mono font-black text-2xl text-indigo-600">{selectedVoxel.letter}</span>
                           <span className="block text-[10px] text-slate-500">{selectedVoxel.gender === 0 ? "Male" : "Female"}</span>
                       </div>
                       <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                           <span className="block text-[10px] text-slate-400 uppercase font-bold">Job Class</span>
                           <div className="font-bold text-amber-600 mt-1">{JOB_NAMES[selectedVoxel.jobClass]}</div>
                           <div className="text-[9px] text-slate-400">Role: {selectedVoxel.jobClass === 1 ? "Predator" : selectedVoxel.jobClass === 3 ? "Defender" : "Worker"}</div>
                       </div>
                  </div>

                  {/* Gene Lab - Traits */}
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                          <Activity size={12} className="text-indigo-600"/>
                          <span className="text-[10px] font-bold text-indigo-800 uppercase">Gene Lab Traits</span>
                      </div>
                      
                      <div className="space-y-2">
                          <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>Aggression (Hunting)</span>
                                  <span className="font-mono">{selectedVoxel.traits?.aggression.toFixed(2)}</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-500" style={{width: `${(selectedVoxel.traits?.aggression || 0) * 100}%`}}></div>
                              </div>
                          </div>
                          <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>Metabolism (Cost)</span>
                                  <span className="font-mono">{selectedVoxel.traits?.metabolism.toFixed(2)}</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{width: `${(selectedVoxel.traits?.metabolism || 0) * 100}%`}}></div>
                              </div>
                          </div>
                          <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>Defense (Armor)</span>
                                  <span className="font-mono">{selectedVoxel.traits?.defense.toFixed(2)}</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{width: `${(selectedVoxel.traits?.defense || 0) * 100}%`}}></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Brain Scan */}
                  {selectedVoxel.lastBrainOutput && (
                      <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                          <div className="flex items-center gap-2 mb-1">
                              <BrainCircuit size={12} className="text-indigo-600"/>
                              <span className="text-[10px] font-bold text-indigo-800 uppercase">Live Neural Activity</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                               <div>
                                   <span className="text-slate-500">Move X</span>
                                   <div className="h-1 bg-slate-200 mt-1 rounded-full overflow-hidden">
                                       <div className="h-full bg-indigo-500" style={{width: `${selectedVoxel.lastBrainOutput[0] * 100}%`}}></div>
                                   </div>
                               </div>
                               <div>
                                   <span className="text-slate-500">Move Z</span>
                                   <div className="h-1 bg-slate-200 mt-1 rounded-full overflow-hidden">
                                       <div className="h-full bg-indigo-500" style={{width: `${selectedVoxel.lastBrainOutput[1] * 100}%`}}></div>
                                   </div>
                               </div>
                               <div>
                                   <span className="text-slate-500">Hunger</span>
                                   <div className="h-1 bg-slate-200 mt-1 rounded-full overflow-hidden">
                                       <div className="h-full bg-red-500" style={{width: `${selectedVoxel.lastBrainOutput[2] * 100}%`}}></div>
                                   </div>
                               </div>
                               <div>
                                   <span className="text-slate-500">Mating</span>
                                   <div className="h-1 bg-slate-200 mt-1 rounded-full overflow-hidden">
                                       <div className="h-full bg-pink-500" style={{width: `${selectedVoxel.lastBrainOutput[3] * 100}%`}}></div>
                                   </div>
                               </div>
                          </div>
                      </div>
                  )}

                  {/* Save Species */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              value={speciesName}
                              onChange={(e) => setSpeciesName(e.target.value)}
                              placeholder="Name this species..."
                              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
                          />
                          <button 
                              onClick={() => {
                                  if(selectedVoxel) onSaveSpecies(selectedVoxel.id, speciesName);
                                  setSpeciesName('');
                              }}
                              disabled={!speciesName}
                              className="bg-indigo-500 text-white p-1.5 rounded-lg disabled:opacity-50 hover:bg-indigo-600"
                          >
                              <Save size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Environment Monitor (Bottom Right) --- */}
      {isLifeMode && (
          <div className="absolute bottom-4 right-4 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur text-white p-4 rounded-2xl border border-slate-700 w-64">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Globe size={14}/> World State</h4>
                  <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span>Pop Count:</span>
                          <span className="text-emerald-400">{voxelCount}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span>Active Tiers:</span>
                          <span className="text-amber-400">0 - 9</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Biomes:</span>
                          <span className="text-indigo-400">4 Active</span>
                      </div>
                  </div>
                  
                  {/* Zoom/Tier Indicator */}
                  <div className="mt-4 pt-2 border-t border-slate-700">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Observation Level</div>
                      <div className="flex gap-1 h-1.5">
                          <div className="flex-1 bg-emerald-500 rounded-full opacity-100"></div>
                          <div className="flex-1 bg-emerald-500 rounded-full opacity-50"></div>
                          <div className="flex-1 bg-emerald-500 rounded-full opacity-20"></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Micro</span>
                          <span>Meso</span>
                          <span>Macro</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
