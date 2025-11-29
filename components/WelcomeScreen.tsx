
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        fixed inset-0 pointer-events-none flex items-center justify-center z-40 select-none p-6
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
    `}>
      <div className={`
          text-center flex flex-col items-center gap-4 bg-slate-50/90 backdrop-blur-md p-8 rounded-3xl border-2 border-slate-200 shadow-2xl max-w-lg w-full transform transition-transform duration-500
          ${visible ? 'translate-y-0 scale-100' : '-translate-y-8 scale-95'}
      `}>
        <div>
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-widest mb-2">
                Voxel Toy Box
            </h1>
            <div className="text-sm font-extrabold text-indigo-600 uppercase tracking-[0.3em]">
                Powered by Gemini 3
            </div>
        </div>
        
        <div className="space-y-3 mt-2">
            <p className="text-lg font-bold text-slate-700">Build amazing voxel models</p>
            <p className="text-lg font-bold text-slate-700">Break them down and rebuild them</p>
            <p className="text-lg font-bold text-slate-700">Share your creations with friends</p>
        </div>
        
        <div className="mt-4 text-xs font-bold text-slate-400 animate-pulse">
            Tap anywhere to begin
        </div>
      </div>
    </div>
  );
};
