/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { generateImage, generateScript, generateScoreMetadata, ScoreMetadata, generateTransitionPrompts } from '../services/geminiService';
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
  
  // Script State
  const [scriptInput, setScriptInput] = useState('');
  const [scriptOutput, setScriptOutput] = useState('');
  
  // Score State
  const [musicPrompt, setMusicPrompt] = useState('');
  const [scores, setScores] = useState<ScoreMetadata[]>([]);
  
  // B-Roll State
  const [bRollIdeas, setBRollIdeas] = useState<string[]>([]);

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
      if(!musicPrompt.trim()) return;
      setIsGenerating(true);
      try {
          const score = await generateScoreMetadata(musicPrompt);
          setScores(prev => [score, ...prev]);
          setMusicPrompt('');
      } catch (e) {
          console.error("Score gen failed", e);
      } finally {
          setIsGenerating(false);
      }
  }

  const handleGenerateBRoll = async () => {
      if(scenes.length === 0) return;
      setIsGenerating(true);
      try {
          const lastScene = scenes[scenes.length - 1];
          const ideas = await generateTransitionPrompts(lastScene.prompt);
          setBRollIdeas(ideas);
      } catch(e) {
          console.error("B-roll failed", e);
      } finally {
          setIsGenerating(false);
      }
  };

  const TabButton: React.FC<{ id: Tab; icon: React.ReactNode; label?: string }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-1 md:px-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors relative ${
        activeTab === id ? 'text-[#E35336]' : 'text-gray-400 hover:text-[#C2B280]'
      }`}
      title={label || id}
    >
      {icon}
      {activeTab === id && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E35336]" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#272757] border-r border-[#3b3b64] w-16 md:w-80 shrink-0 transition-all duration-300 z-30">
      {/* Tabs Navigation */}
      <div className="flex md:grid md:grid-cols-5 border-b border-[#3b3b64] bg-[#1a1a3a] overflow-x-auto hide-scrollbar">
        <TabButton id="snapshots" icon={<GridIcon className="w-5 h-5" />} label="Assets" />
        <TabButton id="screenwriter" icon={<PenToolIcon className="w-5 h-5" />} label="Script" />
        <TabButton id="score" icon={<MusicIcon className="w-5 h-5" />} label="Score" />
        <TabButton id="b-roll" icon={<FilmIcon className="w-5 h-5" />} label="B-Roll" />
        <TabButton id="outtakes" icon={<ScissorsIcon className="w-5 h-5" />} label="Cuts" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600">
        {activeTab === 'snapshots' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1a1a3a]/50 p-4 rounded-xl border border-[#3b3b64] hidden md:block">
              <h3 className="text-xs font-semibold text-[#C2B280] uppercase tracking-wider mb-3">
                Generate Asset (Pro)
              </h3>
              <form onSubmit={handleGenerateAsset}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a character or object..."
                  className="w-full bg-[#151530] border border-[#3b3b64] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E35336] resize-none h-20 mb-3"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#E35336] hover:bg-[#c4442b] disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
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
                      ? 'border-[#E35336] ring-2 ring-[#E35336]/50' 
                      : 'border-transparent hover:border-[#C2B280]/50'
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
                    <div className="absolute top-1 right-1 w-5 h-5 bg-[#E35336] rounded-full flex items-center justify-center">
                       <PlusIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {assets.length === 0 && (
                <div className="col-span-2 py-12 text-center text-[#C2B280] text-sm border-2 border-dashed border-[#3b3b64] rounded-lg opacity-50">
                  <p className="hidden md:block">No assets yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'screenwriter' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-[#1a1a3a]/50 p-4 rounded-xl border border-[#3b3b64] hidden md:block">
              <h3 className="text-xs font-semibold text-[#C2B280] uppercase tracking-wider mb-3">
                Gemini 3 Script Writer
              </h3>
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="Describe your scene idea..."
                className="w-full bg-[#151530] border border-[#3b3b64] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E35336] resize-none h-32 mb-3"
              />
              <button
                onClick={handleGenerateScript}
                disabled={isGenerating || !scriptInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#E35336] hover:bg-[#c4442b] disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
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
              <div className="bg-[#1a1a3a] p-4 rounded-xl border border-[#3b3b64] animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase">Suggested Prompt</h4>
                </div>
                <p className="text-sm text-gray-300 italic mb-4 whitespace-pre-wrap">
                  {scriptOutput}
                </p>
                <button
                  onClick={() => onUseScript(scriptOutput)}
                  className="w-full flex items-center justify-center gap-2 bg-[#3b3b64] hover:bg-[#4b4b74] text-white py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowRightIcon className="w-3 h-3" />
                  Use in Prompt
                </button>
              </div>
            ) : (
                <div className="text-center text-[#C2B280] opacity-50 text-sm py-8">
                    Generate a script to see it here.
                </div>
            )}
          </div>
        )}

        {activeTab === 'score' && (
           <div className="space-y-6 animate-fade-in">
              <div className="bg-[#1a1a3a]/50 p-4 rounded-xl border border-[#3b3b64]">
                <h3 className="text-xs font-semibold text-[#98A869] uppercase tracking-wider mb-3 flex items-center gap-2">
                   <MusicIcon className="w-3 h-3 text-[#98A869]" />
                   Lyria Score (Gen 3)
                </h3>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe mood, instruments, tempo..."
                  className="w-full bg-[#151530] border border-[#3b3b64] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#98A869] resize-none h-24 mb-3"
                />
                 <button
                  onClick={handleGenerateScore}
                  disabled={isGenerating || !musicPrompt.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#98A869] hover:bg-[#7a8a58] disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <MusicIcon className="w-4 h-4" />
                      Compose Metadata
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                  {scores.length === 0 && (
                      <div className="text-center text-[#C2B280] opacity-50 text-xs py-4">
                          No scores generated yet.
                      </div>
                  )}
                  {scores.map((score, i) => (
                      <div key={i} className="p-3 bg-[#1a1a3a] rounded-lg border border-[#3b3b64] flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#98A869]/20 rounded flex items-center justify-center shrink-0">
                              <MusicIcon className="w-4 h-4 text-[#98A869]" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-200 truncate">{score.title}</div>
                              <div className="text-[10px] text-gray-500">{score.bpm} BPM • {score.instruments?.slice(0, 2).join(', ')}</div>
                          </div>
                          <button 
                            onClick={() => alert(`Copied Score: ${score.description}`)}
                            className="text-gray-400 hover:text-white"
                            title="Copy Description"
                          >
                              <PlusIcon className="w-4 h-4"/>
                          </button>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {activeTab === 'b-roll' && (
          <div className="animate-fade-in space-y-4">
            <div className="p-6 bg-[#1a1a3a] rounded-xl border border-[#3b3b64] border-dashed text-center">
              <FilmIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h3 className="text-gray-400 text-sm font-medium">Smart B-Roll</h3>
              {scenes.length > 0 ? (
                 <p className="text-xs text-[#E35336] mt-2">
                    Analyze last scene to generate bridges
                 </p>
              ) : (
                 <p className="text-xs text-gray-600 mt-2">
                    Add scenes to your timeline to generate contextual transitions.
                 </p>
              )}
            </div>
            <button 
                disabled={scenes.length === 0 || isGenerating}
                onClick={handleGenerateBRoll}
                className="w-full py-3 px-4 bg-[#3b3b64] hover:bg-[#4b4b74] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
               {isGenerating ? <div className="animate-spin w-3 h-3 border-2 border-white rounded-full border-t-transparent"/> : <SparklesIcon className="w-3 h-3" />}
               Generate Transitions
            </button>

            {bRollIdeas.length > 0 && (
                <div className="space-y-2 mt-4">
                    {bRollIdeas.map((idea, i) => (
                        <div key={i} className="bg-[#1a1a3a] p-3 rounded-lg border border-[#3b3b64] flex gap-2">
                            <span className="text-xs text-[#C2B280] font-mono mt-0.5">{i+1}</span>
                            <div className="flex-1">
                                <p className="text-xs text-gray-300">{idea}</p>
                                <button 
                                    onClick={() => onUseScript(idea)}
                                    className="text-[10px] text-[#E35336] hover:text-[#c4442b] mt-2 font-medium"
                                >
                                    USE THIS
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {activeTab === 'outtakes' && (
            <div className="animate-fade-in space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Drafts & Alts</h3>
                    <span className="text-[10px] text-gray-600">0 Items</span>
                 </div>
                 <div className="text-center text-[#C2B280] opacity-50 text-xs py-10">
                    No deleted scenes.
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default BinSystem;