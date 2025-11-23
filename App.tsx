/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type {Video} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import BinSystem from './components/BinSystem';
import DirectorAssistant from './components/DirectorAssistant';
import { ChevronDownIcon, ChevronUpIcon, PresentationIcon, TvIcon } from './components/icons';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import Storyboard from './components/Storyboard';
import Timeline from './components/Timeline';
import {generateVideo, generateImage, DirectorAction} from './services/geminiService';
import {
  AppState,
  Asset,
  AspectRatio,
  ContinuityProfile,
  FilmStyle,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  Scene,
  VeoModel,
  VideoFile,
} from './types';

const generateId = () => globalThis.crypto?.randomUUID() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Layout State
  const [activeView, setActiveView] = useState<'studio' | 'storyboard'>('studio');
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isPromptBarCollapsed, setIsPromptBarCollapsed] = useState(false);

  // Studio State
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<GenerateVideoParams | null>(null);

  // --- NEW FEATURES STATE ---
  const [storyMemory, setStoryMemory] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<FilmStyle | null>(null);
  const [continuity, setContinuity] = useState<ContinuityProfile>({ activeAssetIds: [], lightingLock: null });
  const [customStyles, setCustomStyles] = useState<FilmStyle[]>([]);

  // Helpers
  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id));

  const getAssetAsImageFile = async (asset: Asset): Promise<ImageFile> => {
     return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             resolve({
                file: new File([asset.imageBlob], "asset.png", {type: asset.imageBlob.type}),
                base64: (reader.result as string).split(',')[1]
             });
        }
        reader.readAsDataURL(asset.imageBlob);
     })
  }
  
  const [preparedExternalAssets, setPreparedExternalAssets] = useState<ImageFile[]>([]);

  useEffect(() => {
    const prepare = async () => {
        if (selectedAssets.length === 0) {
            setPreparedExternalAssets([]);
            return;
        }
        const files = await Promise.all(selectedAssets.map(getAssetAsImageFile));
        setPreparedExternalAssets(files);
    };
    prepare();
  }, [selectedAssetIds, assets]);


  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        setShowApiKeyDialog(true);
        return;
      }
    }

    setAppState(AppState.LOADING);
    setExternalPrompt(null);
    setInitialFormValues(null);
    setIsPromptBarCollapsed(true);

    try {
      const {objectUrl, blob, video} = await generateVideo(params);
      
      const newScene: Scene = {
        id: generateId(),
        videoUrl: objectUrl,
        videoBlob: blob,
        videoObject: video,
        prompt: params.prompt,
        timestamp: Date.now()
      };
      
      setScenes(prev => [...prev, newScene]);
      setSelectedSceneId(newScene.id);
      setAppState(AppState.SUCCESS);
      setSelectedAssetIds([]);

    } catch (error) {
      console.error('Video generation failed:', error);
      setAppState(AppState.ERROR);
      alert(error instanceof Error ? error.message : "Generation failed");
    }
  }, []);

  const handleExtend = useCallback(async (scene: Scene) => {
    try {
      const file = new File([scene.videoBlob], 'scene_to_extend.mp4', {
        type: scene.videoBlob.type,
      });
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64 = (reader.result as string).split(',')[1];
         const videoFile: VideoFile = {file, base64};
         
         setInitialFormValues({
            prompt: '',
            model: VeoModel.VEO,
            aspectRatio: AspectRatio.LANDSCAPE,
            resolution: Resolution.P720,
            mode: GenerationMode.EXTEND_VIDEO,
            inputVideo: videoFile,
            inputVideoObject: scene.videoObject
         });
         setIsPromptBarCollapsed(false);
       };
       reader.readAsDataURL(scene.videoBlob);

    } catch (error) {
      console.error('Failed to prepare extension', error);
    }
  }, []);

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleDirectorAction = async (action: DirectorAction) => {
      switch(action.type) {
          case 'GENERATE_ASSET':
              try {
                  const { prompt } = action.payload;
                  const { imageUrl, blob } = await generateImage(prompt);
                  const newAsset: Asset = {
                      id: generateId(),
                      imageUrl,
                      imageBlob: blob,
                      prompt,
                      type: 'character'
                  };
                  setAssets(prev => [newAsset, ...prev]);
              } catch (e) { console.error(e); }
              break;
          case 'UPDATE_PROMPT':
              setExternalPrompt(action.payload.prompt);
              setIsPromptBarCollapsed(false);
              break;
          case 'SWITCH_VIEW':
              if (action.payload.view === 'storyboard') setActiveView('storyboard');
              if (action.payload.view === 'studio') setActiveView('studio');
              break;
      }
  };

  return (
    <div className="h-screen text-gray-200 flex flex-col font-sans overflow-hidden">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}

      <DirectorAssistant onAction={handleDirectorAction} />
      
      {/* Soft Sage Header */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 bg-[#2F3E32]/90 backdrop-blur-md shrink-0 z-40 relative shadow-lg">
        <h1 className="text-xl font-bold tracking-wide text-white mr-8 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#E07A5F] shadow-[0_0_10px_#E07A5F]"></span>
          <span className="text-[#D4A373]">Unicorn</span>-Films
        </h1>
        
        <div className="flex bg-black/20 rounded-full p-1 border border-white/10">
             <button 
                onClick={() => setActiveView('studio')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all ${activeView === 'studio' ? 'bg-[#D4A373] text-[#2F3E32] shadow-sm' : 'text-gray-400 hover:text-white'}`}
             >
                <TvIcon className="w-3 h-3" /> Studio
             </button>
             <button 
                onClick={() => setActiveView('storyboard')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all ${activeView === 'storyboard' ? 'bg-[#D4A373] text-[#2F3E32] shadow-sm' : 'text-gray-400 hover:text-white'}`}
             >
                <PresentationIcon className="w-3 h-3" /> Storyboard
             </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Bin System / Story Bucket */}
        <BinSystem 
           assets={assets}
           scenes={scenes}
           onAddAsset={(a) => setAssets(prev => [a, ...prev])}
           onRemoveAsset={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
           selectedAssetIds={selectedAssetIds}
           onSelectAsset={(asset) => setSelectedAssetIds(prev => prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id])}
           onUseScript={(script) => {
               setExternalPrompt(script);
               setIsPromptBarCollapsed(false);
           }}
           storyMemory={storyMemory}
           onUpdateStoryMemory={setStoryMemory}
        />

        {/* Center Stage */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#2F3E32] to-[#1e2922]">
          
          {activeView === 'studio' ? (
              <>
                <div className={`flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative transition-all duration-300 ${isPromptBarCollapsed ? 'pb-24' : 'pb-4'}`}>
                    {appState === AppState.LOADING ? (
                        <LoadingIndicator />
                    ) : selectedScene ? (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                            <video 
                                src={selectedScene.videoUrl} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-full shadow-2xl rounded-xl border border-white/10"
                            />
                            <div className="mt-4 text-sm text-[#D4A373] font-mono max-w-2xl text-center truncate px-4 glass-panel p-2 rounded-lg">
                                {selectedScene.prompt}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-white/40">
                            <h2 className="text-3xl font-light mb-2 text-[#D4A373] tracking-widest">DESERT MIRAGE</h2>
                            <p>Select a style and start your story.</p>
                        </div>
                    )}
                </div>

                <div className={`w-full max-w-5xl mx-auto px-6 relative z-20 transition-all duration-300 ${isPromptBarCollapsed ? 'translate-y-full absolute bottom-0 left-0 right-0' : 'pb-6'}`}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <button 
                            onClick={() => setIsPromptBarCollapsed(!isPromptBarCollapsed)}
                            className="bg-[#2F3E32] border border-white/10 border-b-0 rounded-t-xl px-4 py-1 flex items-center gap-2 text-[10px] uppercase font-bold text-[#D4A373] hover:bg-[#3e5244] shadow-lg"
                        >
                            {isPromptBarCollapsed ? (
                                <>Open Director <ChevronUpIcon className="w-3 h-3" /></>
                            ) : (
                                <>Hide <ChevronDownIcon className="w-3 h-3" /></>
                            )}
                        </button>
                    </div>

                    {!isPromptBarCollapsed && (
                        <PromptForm 
                            onGenerate={handleGenerate} 
                            initialValues={initialFormValues}
                            externalPrompt={externalPrompt}
                            externalReferences={preparedExternalAssets}
                            
                            // New Props
                            assets={assets}
                            selectedStyle={selectedStyle}
                            onSelectStyle={setSelectedStyle}
                            continuity={continuity}
                            onSetContinuity={setContinuity}
                            customStyles={customStyles}
                            onAddCustomStyle={s => setCustomStyles([...customStyles, s])}
                        />
                    )}
                </div>

                <Timeline 
                    scenes={scenes}
                    selectedSceneId={selectedSceneId}
                    onSelectScene={setSelectedSceneId}
                    onDeleteScene={(id) => {
                        setScenes(prev => prev.filter(s => s.id !== id));
                        if (selectedSceneId === id) setSelectedSceneId(null);
                    }}
                    onExtendScene={handleExtend}
                    onAddScene={() => {
                        setSelectedSceneId(null);
                        setInitialFormValues(null);
                        setExternalPrompt(null);
                        setSelectedAssetIds([]);
                    }}
                    isCollapsed={isTimelineCollapsed}
                    onToggleCollapse={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
                />
              </>
          ) : (
              <Storyboard 
                 assets={assets}
                 onInjectToTimeline={(data) => {
                     setExternalPrompt(data.prompt);
                     setActiveView('studio');
                     setIsPromptBarCollapsed(false);
                 }}
              />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;