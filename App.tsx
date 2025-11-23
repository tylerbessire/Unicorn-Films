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
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  Scene,
  VeoModel,
  VideoFile,
} from './types';

// Robust ID generator
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

  // Derived State helpers
  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id));

  // We need to fetch the base64 for assets if we want to pass them to PromptForm properly
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


  // Check for API key on initial load
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
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
        console.warn('Key check failed', error);
        setShowApiKeyDialog(true);
        return;
      }
    }

    setAppState(AppState.LOADING);
    setExternalPrompt(null); // Clear external prompt after usage
    setInitialFormValues(null); // Clear carry-over configs
    setIsPromptBarCollapsed(true); // Auto collapse to show result

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
      
      // Clear selections after successful generation
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
      // We need base64 for the form logic
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64 = (reader.result as string).split(',')[1];
         const videoFile: VideoFile = {file, base64};
         
         setInitialFormValues({
            prompt: '',
            model: VeoModel.VEO, // Extension requires standard veo
            aspectRatio: AspectRatio.LANDSCAPE, // Use a valid default aspect ratio
            resolution: Resolution.P720,
            mode: GenerationMode.EXTEND_VIDEO,
            inputVideo: videoFile,
            inputVideoObject: scene.videoObject
         });
         setIsPromptBarCollapsed(false); // Open prompt bar to show extended settings
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

  const toggleAssetSelection = (asset: Asset) => {
    setSelectedAssetIds(prev => 
      prev.includes(asset.id) 
        ? prev.filter(id => id !== asset.id)
        : [...prev, asset.id]
    );
  };

  const handleStoryboardInject = (data: any) => {
      setExternalPrompt(data.prompt);
      setActiveView('studio');
      setIsPromptBarCollapsed(false);
  };

  // Handler for actions coming from the Director Assistant AI
  const handleDirectorAction = async (action: DirectorAction) => {
      switch(action.type) {
          case 'GENERATE_ASSET':
              try {
                  const { prompt } = action.payload;
                  // Trigger asset generation in background or foreground
                  // We'll do it "live" for the user to see the result in the bin
                  const { imageUrl, blob } = await generateImage(prompt);
                  const newAsset: Asset = {
                      id: generateId(),
                      imageUrl,
                      imageBlob: blob,
                      prompt,
                      type: 'character'
                  };
                  setAssets(prev => [newAsset, ...prev]);
              } catch (e) {
                  console.error("Director failed to generate asset", e);
              }
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
    <div className="h-screen bg-black text-gray-200 flex flex-col font-sans overflow-hidden">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}

      <DirectorAssistant onAction={handleDirectorAction} />
      
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center px-6 bg-[#161617] shrink-0 z-40 relative">
        <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mr-8">
          Veo Studio
        </h1>
        
        {/* View Switcher */}
        <div className="flex bg-[#0f0f10] rounded-lg p-1 border border-gray-800">
             <button 
                onClick={() => setActiveView('studio')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${activeView === 'studio' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
                <TvIcon className="w-3 h-3" /> Studio
             </button>
             <button 
                onClick={() => setActiveView('storyboard')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${activeView === 'storyboard' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
                <PresentationIcon className="w-3 h-3" /> Storyboard
             </button>
        </div>

        <div className="ml-auto text-xs text-gray-500 hidden md:block">
           AI Film Production Platform
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Bins */}
        <BinSystem 
           assets={assets}
           scenes={scenes}
           onAddAsset={(a) => setAssets(prev => [a, ...prev])}
           onRemoveAsset={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
           selectedAssetIds={selectedAssetIds}
           onSelectAsset={toggleAssetSelection}
           onUseScript={(script) => {
               setExternalPrompt(script);
               setIsPromptBarCollapsed(false);
           }}
        />

        {/* Center Stage */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
          
          {activeView === 'studio' ? (
              <>
                {/* Viewport / Player */}
                <div className={`flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative transition-all duration-300 ${isPromptBarCollapsed ? 'pb-24' : 'pb-4'}`}>
                    {appState === AppState.LOADING ? (
                        <LoadingIndicator />
                    ) : selectedScene ? (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                            <video 
                                src={selectedScene.videoUrl} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-full shadow-2xl rounded-lg"
                            />
                            <div className="mt-4 text-sm text-gray-500 font-mono max-w-2xl text-center truncate px-4">
                                {selectedScene.prompt}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-600">
                            <h2 className="text-2xl font-light mb-2">Ready to Direct</h2>
                            <p>Select assets from the bin or type a prompt below.</p>
                        </div>
                    )}
                </div>

                {/* Floating Prompt Bar Container */}
                <div className={`w-full max-w-4xl mx-auto px-6 relative z-10 transition-all duration-300 ${isPromptBarCollapsed ? 'translate-y-full absolute bottom-0 left-0 right-0' : 'pb-6'}`}>
                    {/* Handle for collapsing */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <button 
                            onClick={() => setIsPromptBarCollapsed(!isPromptBarCollapsed)}
                            className="bg-[#1f1f1f] border border-gray-700 border-b-0 rounded-t-lg px-4 py-1 flex items-center gap-2 text-xs text-gray-400 hover:text-white"
                        >
                            {isPromptBarCollapsed ? (
                                <>Show Prompt Bar <ChevronUpIcon className="w-3 h-3" /></>
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
                        />
                    )}
                </div>

                {/* Timeline */}
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
                 onInjectToTimeline={handleStoryboardInject}
              />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;