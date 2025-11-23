/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type {Video} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import BinSystem from './components/BinSystem';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import Timeline from './components/Timeline';
import {generateVideo} from './services/geminiService';
import {
  AppState,
  Asset,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  Scene,
  VeoModel,
  VideoFile,
} from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
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

    try {
      const {objectUrl, blob, video} = await generateVideo(params);
      
      const newScene: Scene = {
        id: crypto.randomUUID(),
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
            aspectRatio: Resolution.P720 as any, // Ignore ratio for extend
            resolution: Resolution.P720,
            mode: GenerationMode.EXTEND_VIDEO,
            inputVideo: videoFile,
            inputVideoObject: scene.videoObject
         });
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

  return (
    <div className="h-screen bg-black text-gray-200 flex flex-col font-sans overflow-hidden">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}
      
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center px-6 bg-[#161617] shrink-0 z-20">
        <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Veo Studio
        </h1>
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
           onUseScript={(script) => setExternalPrompt(script)}
        />

        {/* Center Stage */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
          
          {/* Viewport / Player */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
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

          {/* Floating Prompt Bar */}
          <div className="w-full max-w-4xl mx-auto px-6 pb-6 relative z-10">
             <PromptForm 
                onGenerate={handleGenerate} 
                initialValues={initialFormValues}
                externalPrompt={externalPrompt}
                externalReferences={preparedExternalAssets}
             />
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
          />
        </div>
      </div>
    </div>
  );
};

export default App;