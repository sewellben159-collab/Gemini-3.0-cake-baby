
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Species } from '../types';
import { GENE_COLORS, GENE_DESCRIPTIONS, TIER_NAMES } from '../utils/voxelConstants';
import { Trash2, TestTube, X, Dna } from 'lucide-react';

interface SpeciesCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  speciesList: Species[];
  onLoad: (s: Species) => void;
  onDelete: (id: string) => void;
}

export const SpeciesCatalog: React.FC<SpeciesCatalogProps> = ({ isOpen, onClose, speciesList, onLoad, onDelete }) => {
  if (!isOpen) return null;

  const GeneStrip: React.FC<{ gene: string }> = ({ gene }) => (
      <div className="flex gap-0.5">
          {gene.split('').map((base, i) => (
              <div key={i} className={`w-3 h-4 rounded-[1px] ${GENE_COLORS[base] || 'bg-gray-400'}`} title={GENE_DESCRIPTIONS[base]} />
          ))}
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col h-[80vh] border-4 border-indigo-50 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-indigo-50 bg-indigo-50/50 rounded-t-[20px]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
                <Dna size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    Species Catalog
                </h2>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                    Global Library • {speciesList.length} Specimens
                </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {speciesList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <Dna size={64} className="mb-4 text-slate-300"/>
                  <p className="font-bold text-lg">No species discovered yet.</p>
                  <p className="text-xs">Save species from the Inspector to populate the catalog.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {speciesList.map((s) => (
                      <div key={s.id} className="bg-white rounded-2xl border-2 border-slate-100 p-4 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md group">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <h3 className="font-black text-slate-700 text-lg leading-tight truncate w-40" title={s.name}>{s.name}</h3>
                                  <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400 mt-1">
                                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{s.letter} Type</span>
                                      <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{TIER_NAMES[s.tier] || "Unknown"}</span>
                                  </div>
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => onDelete(s.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                          
                          <div className="space-y-3 mb-4">
                              <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-400">Struct</span>
                                  <GeneStrip gene={s.structGene} />
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-400">Interact</span>
                                  <GeneStrip gene={s.interactGene} />
                              </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-2 text-[10px] text-slate-500 mb-4 border border-slate-100">
                              <div className="flex justify-between">
                                  <span>Environment:</span>
                                  <span className="font-bold text-indigo-500">{s.environment}</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                  <span>Discovered:</span>
                                  <span className="font-mono">{new Date(s.timestamp).toLocaleDateString()}</span>
                              </div>
                          </div>

                          <button 
                            onClick={() => { onLoad(s); onClose(); }}
                            className="w-full py-2 bg-indigo-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                          >
                              <TestTube size={16} strokeWidth={2.5}/> Inject Sample
                          </button>
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
