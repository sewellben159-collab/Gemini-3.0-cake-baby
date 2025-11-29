
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SpeciesCatalog } from './components/SpeciesCatalog';
import { Generators } from './utils/voxelGenerators';
import { AppState, VoxelData, SavedModel, Species, SimulationVoxel } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'create' | 'morph'>('create');
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  // --- State for Custom Models ---
  const [currentBaseModel, setCurrentBaseModel] = useState<string>('Eagle');
  const [customBuilds, setCustomBuilds] = useState<SavedModel[]>([]);
  const [customRebuilds, setCustomRebuilds] = useState<SavedModel[]>([]);
  
  // --- Life Game State ---
  const [isLifeMode, setIsLifeMode] = useState(false);
  const [selectedVoxel, setSelectedVoxel] = useState<SimulationVoxel | null>(null);
  
  // Environment State
  const [currentEvent, setCurrentEvent] = useState<number>(-1);
  const [tierStats, setTierStats] = useState<number[]>([0,0,0,0]);
  const [isAutoCycle, setIsAutoCycle] = useState(true); 

  // Species Catalog
  const [discoveredSpecies, setDiscoveredSpecies] = useState<Species[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // --- Drag Selection State ---
  const [selectionBox, setSelectionBox] = useState<{start: {x:number, y:number} | null, current: {x:number, y:number} | null} | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Engine
    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => {
          setVoxelCount(count);
          if (engineRef.current) setTierStats(engineRef.current.getTierStats());
      }
    );
    
    engine.setEventCallback((evt) => setCurrentEvent(evt));
    engine.setAutoCycle(true); 
    
    engine.setSpeciesDiscoveryCallback((s: Species) => {
        setDiscoveredSpecies(prev => {
            if (prev.some(ex => ex.id === s.id)) return prev;
            return [...prev, s];
        });
    });
    
    engine.setVoxelSelectCallback((v) => {
        setSelectedVoxel(v ? {...v} : null); 
    });

    engineRef.current = engine;

    engine.loadInitialModel(Generators.Eagle());

    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);
    
    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  // --- Input Handling for Drag Select ---
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only proceed if dragging in life mode using Left Mouse Button (0)
    // Also ignore clicks on UI buttons (quick fix for propagation)
    if (e.button === 0 && isLifeMode) {
        if ((e.target as HTMLElement).closest('button, input, textarea')) return;

        // Note: We don't prevent default here as VoxelEngine might need click event
        isDragging.current = true;
        setSelectionBox({
            start: { x: e.clientX, y: e.clientY },
            current: { x: e.clientX, y: e.clientY }
        });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current && selectionBox?.start) {
        setSelectionBox({
            ...selectionBox,
            current: { x: e.clientX, y: e.clientY }
        });
    }
  };

  const handlePointerUp = () => {
    if (isDragging.current && selectionBox?.start && selectionBox?.current) {
        const left = Math.min(selectionBox.start.x, selectionBox.current.x);
        const top = Math.min(selectionBox.start.y, selectionBox.current.y);
        const width = Math.abs(selectionBox.current.x - selectionBox.start.x);
        const height = Math.abs(selectionBox.current.y - selectionBox.start.y);

        if (width > 5 && height > 5 && engineRef.current) {
             engineRef.current.selectBox({ left, top, width, height });
        }
    }
    isDragging.current = false;
    setSelectionBox(null);
  };

  const handleDismantle = () => {
    engineRef.current?.dismantle();
  };

  const handleNewScene = (type: 'Eagle') => {
    const generator = Generators[type];
    if (generator && engineRef.current) {
      setIsLifeMode(false);
      engineRef.current.loadInitialModel(generator(), AppState.STABLE);
      setCurrentBaseModel('Eagle');
    }
  };
  
  const handleStartLife = () => {
      if (engineRef.current) {
          setIsLifeMode(true);
          engineRef.current.loadInitialModel(Generators.PrimordialSoup(), AppState.LIFE_SIMULATION);
          setCurrentBaseModel('Primordial Soup');
      }
  };
  
  const handleTriggerEvent = (evt: number) => {
      if (isAutoCycle) {
          setIsAutoCycle(false);
          engineRef.current?.setAutoCycle(false);
      }
      engineRef.current?.triggerEvent(evt);
  }
  
  const handleToggleAutoCycle = () => {
      const newState = !isAutoCycle;
      setIsAutoCycle(newState);
      engineRef.current?.setAutoCycle(newState);
  }
  
  const handleLoadSpecies = (s: Species) => {
      engineRef.current?.injectSpecies(s);
  }

  const handleDeleteSpecies = (id: string) => {
      setDiscoveredSpecies(prev => prev.filter(s => s.id !== id));
  }
  
  const handleInjectStrain = (struct: string, interact: string) => {
      engineRef.current?.injectStrain(struct, interact);
  }
  
  const handleUpdateVoxel = (id: number, struct: string, interact: string) => {
      engineRef.current?.updateVoxelGenetics(id, struct, interact);
      if (selectedVoxel && selectedVoxel.id === id) {
          setSelectedVoxel({
              ...selectedVoxel,
              structGene: struct,
              interactGene: interact
          });
      }
  }

  const handleSaveSpecies = (id: number, name: string) => {
      engineRef.current?.saveSpeciesFromVoxel(id, name);
  }

  const handleSelectCustomBuild = (model: SavedModel) => {
      if (engineRef.current) {
          setIsLifeMode(false);
          engineRef.current.loadInitialModel(model.data);
          setCurrentBaseModel(model.name);
      }
  };

  const handleRebuild = (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => {
    const generator = Generators[type];
    if (generator && engineRef.current) {
      engineRef.current.rebuild(generator());
    }
  };

  const handleSelectCustomRebuild = (model: SavedModel) => {
      if (engineRef.current) {
          engineRef.current.rebuild(model.data);
      }
  };

  const handleShowJson = () => {
    if (engineRef.current) {
      setJsonData(engineRef.current.getJsonData());
      setJsonModalMode('view');
      setIsJsonModalOpen(true);
    }
  };

  const handleImportClick = () => {
      setJsonModalMode('import');
      setIsJsonModalOpen(true);
  };

  const handleJsonImport = (jsonStr: string) => {
      try {
          const rawData = JSON.parse(jsonStr);
          if (!Array.isArray(rawData)) throw new Error("JSON must be an array");

          const voxelData: VoxelData[] = rawData.map((v: any) => {
              let colorVal = v.c || v.color;
              let colorInt = 0xCCCCCC;

              if (typeof colorVal === 'string') {
                  if (colorVal.startsWith('#')) colorVal = colorVal.substring(1);
                  colorInt = parseInt(colorVal, 16);
              } else if (typeof colorVal === 'number') {
                  colorInt = colorVal;
              }

              return {
                  x: Number(v.x) || 0,
                  y: Number(v.y) || 0,
                  z: Number(v.z) || 0,
                  color: isNaN(colorInt) ? 0xCCCCCC : colorInt
              };
          });
          
          if (engineRef.current) {
              setIsLifeMode(false);
              engineRef.current.loadInitialModel(voxelData);
              setCurrentBaseModel('Imported Build');
          }
      } catch (e) {
          console.error("Failed to import JSON", e);
          alert("Failed to import JSON. Please ensure the format is correct.");
      }
  };

  const openPrompt = (mode: 'create' | 'morph') => {
      setPromptMode(mode);
      setIsPromptModalOpen(true);
  }
  
  const handleToggleRotation = () => {
      const newState = !isAutoRotate;
      setIsAutoRotate(newState);
      if (engineRef.current) {
          engineRef.current.setAutoRotate(newState);
      }
  }

  const handlePromptSubmit = async (prompt: string) => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }

    setIsGenerating(true);
    setIsPromptModalOpen(false);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';
        
        let systemContext = "";
        if (promptMode === 'morph' && engineRef.current) {
            const availableColors = engineRef.current.getUniqueColors().join(', ');
            systemContext = `
                CONTEXT: You are re-assembling an existing pile of lego-like voxels.
                The current pile consists of these colors: [${availableColors}].
                TRY TO USE THESE COLORS if they fit the requested shape.
                If the requested shape absolutely requires different colors, you may use them, but prefer the existing palette to create a "rebuilding" effect.
                The model should be roughly the same volume as the previous one.
            `;
        } else {
            systemContext = `
                CONTEXT: You are creating a brand new voxel art scene from scratch.
                Be creative with colors.
            `;
        }

        const response = await ai.models.generateContent({
            model,
            contents: `
                    ${systemContext}
                    
                    Task: Generate a 3D voxel art model of: "${prompt}".
                    
                    Strict Rules:
                    1. Use approximately 150 to 600 voxels.
                    2. The model must be centered at x=0, z=0.
                    3. The bottom of the model must be at y=0 or slightly higher.
                    4. Ensure the structure is physically plausible (connected).
                    5. Coordinates should be integers.
                    
                    Return ONLY a JSON array of objects.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.INTEGER },
                            y: { type: Type.INTEGER },
                            z: { type: Type.INTEGER },
                            color: { type: Type.STRING, description: "Hex color code e.g. #FF5500" }
                        },
                        required: ["x", "y", "z", "color"]
                    }
                }
            }
        });

        if (response.text) {
            const rawData = JSON.parse(response.text);
            
            const voxelData: VoxelData[] = rawData.map((v: any) => {
                let colorStr = v.color;
                if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                const colorInt = parseInt(colorStr, 16);
                
                return {
                    x: v.x,
                    y: v.y,
                    z: v.z,
                    color: isNaN(colorInt) ? 0xCCCCCC : colorInt
                };
            });

            if (engineRef.current) {
                setIsLifeMode(false);
                if (promptMode === 'create') {
                    engineRef.current.loadInitialModel(voxelData);
                    setCustomBuilds(prev => [...prev, { name: prompt, data: voxelData }]);
                    setCurrentBaseModel(prompt);
                } else {
                    engineRef.current.rebuild(voxelData);
                    setCustomRebuilds(prev => [...prev, { 
                        name: prompt, 
                        data: voxelData,
                        baseModel: currentBaseModel 
                    }]);
                }
            }
        }
    } catch (err) {
        console.error("Generation failed", err);
        alert("Oops! Something went wrong generating the model.");
    } finally {
        setIsGenerating(false);
    }
  };

  const relevantRebuilds = customRebuilds.filter(
      r => r.baseModel === currentBaseModel
  );

  return (
    <div 
        className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* Selection Box Render */}
      {selectionBox && selectionBox.start && selectionBox.current && (
          <div className="absolute border-2 border-indigo-400 bg-indigo-500/20 pointer-events-none z-50"
               style={{
                   left: Math.min(selectionBox.start.x, selectionBox.current.x),
                   top: Math.min(selectionBox.start.y, selectionBox.current.y),
                   width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                   height: Math.abs(selectionBox.current.y - selectionBox.start.y)
               }}
          />
      )}

      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        customBuilds={customBuilds}
        customRebuilds={relevantRebuilds} 
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        isLifeMode={isLifeMode}
        onDismantle={handleDismantle}
        onRebuild={handleRebuild}
        onNewScene={handleNewScene}
        onStartLife={handleStartLife}
        onSelectCustomBuild={handleSelectCustomBuild}
        onSelectCustomRebuild={handleSelectCustomRebuild}
        onPromptCreate={() => openPrompt('create')}
        onPromptMorph={() => openPrompt('morph')}
        onShowJson={handleShowJson}
        onImportJson={handleImportClick}
        onToggleRotation={handleToggleRotation}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
        currentEvent={currentEvent}
        tierStats={tierStats}
        onTriggerEvent={handleTriggerEvent}
        discoveredSpecies={discoveredSpecies}
        onLoadSpecies={handleLoadSpecies}
        isAutoCycle={isAutoCycle}
        onToggleAutoCycle={handleToggleAutoCycle}
        
        selectedVoxel={selectedVoxel}
        onDeselect={() => setSelectedVoxel(null)}
        onInjectStrain={handleInjectStrain}
        onUpdateVoxel={handleUpdateVoxel}
        onSaveSpecies={handleSaveSpecies}

        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      <WelcomeScreen visible={showWelcome} />
      
      <SpeciesCatalog 
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          speciesList={discoveredSpecies}
          onLoad={handleLoadSpecies}
          onDelete={handleDeleteSpecies}
      />

      <JsonModal 
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        data={jsonData}
        isImport={jsonModalMode === 'import'}
        onImport={handleJsonImport}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        mode={promptMode}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};

export default App;
