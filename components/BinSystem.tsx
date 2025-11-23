/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { generateImage, generateScript, generateScoreMetadata, generateTransitionPrompts } from '../services/geminiService';
import { Asset, Scene, StoryBucket } from '../types';
import { ArrowRightIcon, FilmIcon, GridIcon, MusicIcon, PenToolIcon, PlusIcon, ScissorsIcon, SparklesIcon, XMarkIcon } from './icons';

interface BinSystemProps {
  assets: Asset[];
  scenes: Scene[];
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
  selectedAssetIds: string[];
  onUseScript: (script: string) => void;
  
  // New props for Story Buckets
  storyMemory: string;
  onUpdateStoryMemory: (text: string) => void;
}

type Tab = 'bucket' | 'script' | 'score' | 'b-roll';

const generateId = () => globalThis.crypto?.randomUUID() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));

const BinSystem: React.FC<BinSystemProps> = ({ 
  assets, 
  scenes,
  onAddAsset, 
  onRemoveAsset, 
  onSelectAsset, 
  selectedAssetIds,
  onUseScript,
  storyMemory,
  onUpdateStoryMemory
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('bucket');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptInput, setScriptInput] = useState('');
  const [scriptOutput, setScriptOutput] = useState('');
  const [musicPrompt, setMusicPrompt] = useState('');
  const [scores, setScores] = useState<any[]>([]);
  const [bRollIdeas, setBRollIdeas] = useState<string[]>([]);

  const handleGenerateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const { imageUrl, blob } = await generateImage(prompt);
      onAddAsset({
        id: generateId(),
        imageUrl,
        imageBlob: blob,
        prompt,
        type: 'character' // Defaulting to character for now
      });
      setPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const TabButton: React.FC<{ id: Tab; icon: React.ReactNode; label?: string }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all relative ${
        activeTab === id ? 'text-[#D4A373]' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {activeTab === id && <span className="absolute bottom-0 w-8 h-0.5 bg-[#D4A373] rounded-t-full" />}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#2F3E32]/95 backdrop-blur-md border-r border-white/10 w-16 md:w-80 shrink-0 z-30 shadow-2xl">
      <div className="flex border-b border-white/10 bg-black/20">
        <TabButton id="bucket" icon={<GridIcon className="w-5 h-5" />} label="Bucket" />
        <TabButton id="script" icon={<PenToolIcon className="w-5 h-5" />} label="Script" />
        <TabButton id="score" icon={<MusicIcon className="w-5 h-5" />} label="Score" />
        <TabButton id="b-roll" icon={<FilmIcon className="w-5 h-5" />} label="B-Roll" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {activeTab === 'bucket' && (
          <div className="space-y-6 animate-fade-in">
             {/* Story Memory */}
             <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                 <h3 className="text-[10px] font-bold text-[#E07A5F] uppercase tracking-wider mb-2">Story Memory</h3>
                 <textarea 
                    value={storyMemory}
                    onChange={(e) => onUpdateStoryMemory(e.target.value)}
                    placeholder="Current plot state (e.g. 'John is injured')..."
                    className="w-full bg-transparent text-xs text-white/80 focus:outline-none resize-none h-16"
                 />
             </div>

             {/* Asset Generator */}
             <div className="glass-panel p-4 rounded-xl">
               <h3 className="text-xs font-semibold text-[#D4A373] uppercase tracking-wider mb-3">Add Asset</h3>
               <form onSubmit={handleGenerateAsset}>
                 <textarea
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   placeholder="Character or prop description..."
                   className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4A373] resize-none h-16 mb-2"
                 />
                 <button
                   type="submit"
                   disabled={isGenerating || !prompt.trim()}
                   className="w-full flex items-center justify-center gap-2 bg-[#D4A373] hover:bg-[#b0855a] text-[#2F3E32] py-2 rounded-lg text-xs font-bold transition-colors"
                 >
                   {isGenerating ? "Creating..." : "Generate Asset"}
                 </button>
               </form>
             </div>

             {/* Asset Grid */}
             <div className="grid grid-cols-2 gap-3">
               {assets.map((asset) => (
                 <div 
                   key={asset.id} 
                   onClick={() => onSelectAsset(asset)}
                   className={`relative aspect-square group rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                     selectedAssetIds.includes(asset.id) 
                       ? 'border-[#E07A5F] ring-2 ring-[#E07A5F]/50' 
                       : 'border-white/5 hover:border-white/30'
                   }`}
                 >
                   <img src={asset.imageUrl} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.id); }} className="p-1.5 bg-red-500/80 rounded-full text-white">
                       <XMarkIcon className="w-3 h-3" />
                     </button>
                   </div>
                   {selectedAssetIds.includes(asset.id) && (
                     <div className="absolute top-1 right-1 w-4 h-4 bg-[#E07A5F] rounded-full flex items-center justify-center">
                        <PlusIcon className="w-2 h-2 text-white" />
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Keeping Script/Score tabs simpler for brevity but maintaining structure */}
        {activeTab === 'script' && (
             <div className="glass-panel p-4 rounded-xl animate-fade-in">
                 <h3 className="text-xs font-semibold text-[#D4A373] uppercase tracking-wider mb-3">Script Writer</h3>
                 <textarea value={scriptInput} onChange={e => setScriptInput(e.target.value)} className="w-full bg-black/30 text-xs text-white p-2 rounded h-32 mb-2" placeholder="Describe scene..."/>
                 <button onClick={async () => {
                     setIsGenerating(true);
                     const res = await generateScript(scriptInput);
                     setScriptOutput(res);
                     setIsGenerating(false);
                 }} className="w-full bg-[#D4A373] text-[#2F3E32] py-2 rounded text-xs font-bold mb-4">Refine</button>
                 {scriptOutput && (
                     <div className="bg-black/20 p-2 rounded border border-white/10">
                         <p className="text-xs text-white/80 whitespace-pre-wrap">{scriptOutput}</p>
                         <button onClick={() => onUseScript(scriptOutput)} className="mt-2 text-[10px] text-[#E07A5F] uppercase font-bold">Use This</button>
                     </div>
                 )}
             </div>
        )}
        
        {activeTab === 'score' && (
            <div className="text-center py-10 text-white/30 text-xs">Score Composer Module</div>
        )}

        {activeTab === 'b-roll' && (
             <div className="glass-panel p-4 rounded-xl animate-fade-in text-center">
                 <button 
                    onClick={async () => {
                        setIsGenerating(true);
                        // Mocking behavior for now as we don't have scenes prop fully wired in bin
                        const ideas = await generateTransitionPrompts("General scene"); 
                        setBRollIdeas(ideas);
                        setIsGenerating(false);
                    }}
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg text-xs font-bold"
                 >
                     {isGenerating ? "Thinking..." : "Generate Transitions"}
                 </button>
                 <div className="mt-4 space-y-2 text-left">
                     {bRollIdeas.map((idea, i) => (
                         <div key={i} className="text-xs text-white/70 bg-black/20 p-2 rounded border border-white/5 cursor-pointer hover:border-[#D4A373]" onClick={() => onUseScript(idea)}>
                             {idea}
                         </div>
                     ))}
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default BinSystem;