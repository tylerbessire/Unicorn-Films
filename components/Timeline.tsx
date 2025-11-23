/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Scene } from '../types';
import { ChevronDownIcon, ChevronUpIcon, PlayIcon, PlusIcon, ScissorsIcon, TrashIcon } from './icons';

interface TimelineProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onExtendScene: (scene: Scene) => void;
  onAddScene: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  scenes,
  selectedSceneId,
  onSelectScene,
  onDeleteScene,
  onExtendScene,
  onAddScene,
  isCollapsed,
  onToggleCollapse
}) => {
  return (
    <div className={`bg-[#121212] border-t border-gray-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'h-10' : 'h-64'}`}>
      <div 
        className="h-10 bg-[#1c1c1e] border-b border-gray-800 flex items-center px-4 justify-between cursor-pointer hover:bg-[#252527]"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Story Timeline</span>
            <div className="h-4 w-px bg-gray-700"></div>
            <span className="text-xs text-gray-500">{scenes.length} Scenes</span>
        </div>
        
        <div className="flex items-center gap-4">
           {!isCollapsed && (
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddScene();
                }}
                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors font-medium mr-2"
              >
                <PlusIcon className="w-3 h-3" />
                New Sequence
              </button>
           )}
           {isCollapsed ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 overflow-x-auto p-4 flex gap-2 items-center animate-fade-in">
          {scenes.length === 0 ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
               <p className="text-sm">Timeline Empty</p>
               <p className="text-xs mt-1">Generate a video to start your story</p>
             </div>
          ) : (
            scenes.map((scene, index) => {
              const isSelected = selectedSceneId === scene.id;
              return (
                <div 
                  key={scene.id}
                  onClick={() => onSelectScene(scene.id)}
                  className={`relative group shrink-0 w-64 h-36 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <video 
                    src={scene.videoUrl} 
                    className="w-full h-full object-cover pointer-events-none"
                    preload="metadata"
                  />
                  
                  {/* Scene Number Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-[10px] font-mono text-gray-300">
                    SCENE {index + 1}
                  </div>

                  {/* Controls overlay */}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScene(scene.id);
                        }}
                         className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm"
                         title="Play"
                      >
                        <PlayIcon className="w-4 h-4 fill-white" />
                      </button>
                      {/* Extend Button - The core chaining feature */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtendScene(scene);
                        }}
                        className="p-2 bg-indigo-600/80 hover:bg-indigo-600 rounded-full text-white backdrop-blur-sm"
                        title="Extend this clip"
                      >
                        <ScissorsIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteScene(scene.id);
                        }}
                        className="p-2 bg-red-600/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Timeline;