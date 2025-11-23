/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { generateImage, generateScript } from '../services/geminiService';
import { Asset, Scene } from '../types';
import { ArrowRightIcon, FilmIcon, GridIcon, MusicIcon, PenToolIcon, PlusIcon, ScissorsIcon, SparklesIcon, XMarkIcon } from './icons';

interface BinSystemProps {
  assets: Asset[];
  scenes: Scene[];
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
  selectedAssetIds: string[];
  onUseScript: (script: string) => void;
}

type Tab = 'snapshots' | 'screenwriter' | 'score' | 'b-roll' | 'outtakes';

// Robust ID generator
const generateId = () => globalThis.crypto?.randomUUID() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));

const BinSystem: React.FC<BinSystemProps> = ({ 
  assets, 
  scenes,
  onAddAsset, 
  onRemoveAsset, 
  onSelectAsset, 
  selectedAssetIds,
  onUseScript 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('snapshots');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptInput, setScriptInput] = useState('');
  const [scriptOutput, setScriptOutput] = useState('');
  const [musicPrompt, setMusicPrompt] = useState('');

  const handleGenerateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const { imageUrl, blob } = await generateImage(prompt);
      const newAsset: Asset = {
        id: generateId(),
        imageUrl,
        imageBlob: blob,
        prompt,
        type: 'character'
      };
      onAddAsset(newAsset);
      setPrompt('');
    } catch (error) {
      console.error("Failed to generate asset", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptInput.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateScript(scriptInput);
      setScriptOutput(result);
    } catch (error) {
      console.error("Failed to generate script", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScore = async () => {
      // Mock Lyria generation for demo
      setIsGenerating(true);
      await new Promise(r => setTimeout(r, 2000));
      setIsGenerating(false);
      setMusicPrompt('');
      alert("Musical Score successfully generated (Mock).");
  }

  const TabButton: React.FC<{ id: Tab; icon: React.ReactNode; label?: string }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-1 md:px-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors relative ${
        activeTab === id ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
      }`}
      title={label || id}
    >
      {icon}
      {activeTab === id && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] border-r border-gray-800 w-16 md:w-80 shrink-0 transition-all duration-300 z-30">
      {/* Tabs Navigation */}
      <div className="flex md:grid md:grid-cols-5 border-b border-gray-800 bg-[#121212] overflow-x-auto hide-scrollbar">
        <TabButton id="snapshots" icon={<GridIcon className="w-5 h-5" />} label="Assets" />
        <TabButton id="screenwriter" icon={<PenToolIcon className="w-5 h-5" />} label="Script" />
        <TabButton id="score" icon={<MusicIcon className="w-5 h-5" />} label="Score" />
        <TabButton id="b-roll" icon={<FilmIcon className="w-5 h-5" />} label="B-Roll" />
        <TabButton id="outtakes" icon={<ScissorsIcon className="w-5 h-5" />} label="Cuts" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700">
        {activeTab === 'snapshots' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 hidden md:block">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Generate Asset
              </h3>
              <form onSubmit={handleGenerateAsset}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a character or object..."
                  className="w-full bg-black/50 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20 mb-3"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assets.map((asset) => (
                <div 
                  key={asset.id} 
                  className={`relative aspect-square group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedAssetIds.includes(asset.id) 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50' 
                      : 'border-transparent hover:border-gray-600'
                  }`}
                  onClick={() => onSelectAsset(asset)}
                >
                  <img src={asset.imageUrl} alt={asset.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAsset(asset.id);
                      }}
                      className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full text-white"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                  {selectedAssetIds.includes(asset.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                       <PlusIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {assets.length === 0 && (
                <div className="col-span-2 py-12 text-center text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                  <p className="hidden md:block">No assets yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'screenwriter' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 hidden md:block">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                AI Script Assistant
              </h3>
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="Describe your scene idea..."
                className="w-full bg-black/50 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-32 mb-3"
              />
              <button
                onClick={handleGenerateScript}
                disabled={isGenerating || !scriptInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Refine Idea
                  </>
                )}
              </button>
            </div>
            
            {scriptOutput ? (
              <div className="bg-[#2c2c2e] p-4 rounded-xl border border-gray-700 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase">Suggested Prompt</h4>
                </div>
                <p className="text-sm text-gray-300 italic mb-4 whitespace-pre-wrap">
                  {scriptOutput}
                </p>
                <button
                  onClick={() => onUseScript(scriptOutput)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowRightIcon className="w-3 h-3" />
                  Use in Prompt
                </button>
              </div>
            ) : (
                <div className="text-center text-gray-500 text-sm py-8">
                    Generate a script to see it here.
                </div>
            )}
          </div>
        )}

        {activeTab === 'score' && (
           <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                   <MusicIcon className="w-3 h-3 text-purple-400" />
                   Lyria Realtime Score
                </h3>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe mood, instruments, tempo..."
                  className="w-full bg-black/50 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-24 mb-3"
                />
                 <button
                  onClick={handleGenerateScore}
                  disabled={isGenerating || !musicPrompt.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <MusicIcon className="w-4 h-4" />
                      Generate Score
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                  <div className="p-3 bg-[#2c2c2e] rounded-lg border border-gray-700 flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-900/50 rounded flex items-center justify-center">
                          <MusicIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-300 truncate">Suspenseful Orchestral Swell</div>
                          <div className="text-[10px] text-gray-500">00:32 • 120 BPM</div>
                      </div>
                      <button className="text-gray-400 hover:text-white"><PlusIcon className="w-4 h-4"/></button>
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'b-roll' && (
          <div className="animate-fade-in space-y-4">
            <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed text-center">
              <FilmIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h3 className="text-gray-400 text-sm font-medium">Smart B-Roll</h3>
              {scenes.length > 0 ? (
                 <p className="text-xs text-indigo-400 mt-2">
                    Analyzing {scenes.length} scene{scenes.length !== 1 ? 's' : ''} for transitions...
                 </p>
              ) : (
                 <p className="text-xs text-gray-600 mt-2">
                    Add scenes to your timeline to generate contextual transitions.
                 </p>
              )}
            </div>
            <button 
                disabled={scenes.length === 0}
                onClick={() => alert("Transition generation coming soon!")}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
               <SparklesIcon className="w-3 h-3" />
               Auto-Fill Transitions
            </button>
          </div>
        )}

        {activeTab === 'outtakes' && (
            <div className="animate-fade-in space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Drafts & Alts</h3>
                    <span className="text-[10px] text-gray-600">2 Items</span>
                 </div>
                
                <div className="space-y-3">
                    <div className="group relative aspect-video bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-gray-600 font-mono">DELETED SCENE 1</span>
                        </div>
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button className="p-1.5 bg-indigo-600 rounded-full text-white" title="Restore"><PlusIcon className="w-3 h-3"/></button>
                         </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default BinSystem;