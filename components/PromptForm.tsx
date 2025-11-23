/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type {Video} from '@google/genai';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AspectRatio,
  Asset,
  ContinuityProfile,
  FilmStyle,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  VeoModel,
  VideoFile,
} from '../types';
import ContinuityPanel from './ContinuityPanel';
import StyleSelector from './StyleSelector';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  FilmIcon,
  FramesModeIcon,
  PlusIcon,
  RectangleStackIcon,
  ReferencesModeIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TextModeIcon,
  TvIcon,
  XMarkIcon,
} from './icons';

// Helpers
const fileToBase64 = <T extends {file: File; base64: string}>(
  file: File,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (base64) {
        resolve({file, base64} as T);
      } else {
        reject(new Error('Failed to read file as base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
const fileToImageFile = (file: File): Promise<ImageFile> =>
  fileToBase64<ImageFile>(file);
const fileToVideoFile = (file: File): Promise<VideoFile> =>
  fileToBase64<VideoFile>(file);

// Components
const CustomSelect: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({label, value, onChange, icon, children, disabled = false}) => (
  <div>
    <label
      className={`text-xs block mb-1.5 font-medium ${
        disabled ? 'text-gray-500' : 'text-[#D4A373]'
      }`}>
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {icon}
      </div>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="glass-input w-full rounded-lg pl-10 pr-8 py-2.5 appearance-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200">
        {children}
      </select>
      <ChevronDownIcon
        className={`w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          disabled ? 'text-gray-600' : 'text-gray-400'
        }`}
      />
    </div>
  </div>
);

const ImageUpload: React.FC<{
  onSelect: (image: ImageFile) => void;
  onRemove?: () => void;
  image?: ImageFile | null;
  label: React.ReactNode;
}> = ({onSelect, onRemove, image, label}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageFile = await fileToImageFile(file);
        onSelect(imageFile);
      } catch (error) {
        console.error('Error converting file:', error);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  if (image) {
    return (
      <div className="relative w-28 h-20 group">
        <img
          src={URL.createObjectURL(image.file)}
          alt="preview"
          className="w-full h-full object-cover rounded-lg border border-white/20"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-28 h-20 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors">
      <PlusIcon className="w-6 h-6" />
      <span className="text-xs mt-1">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </button>
  );
};

interface PromptFormProps {
  onGenerate: (params: GenerateVideoParams) => void;
  initialValues?: GenerateVideoParams | null;
  externalPrompt?: string | null;
  externalReferences?: ImageFile[];
  
  // New props for state lifting
  assets: Asset[];
  selectedStyle: FilmStyle | null;
  onSelectStyle: (style: FilmStyle | null) => void;
  continuity: ContinuityProfile;
  onSetContinuity: (c: ContinuityProfile) => void;
  customStyles: FilmStyle[];
  onAddCustomStyle: (s: FilmStyle) => void;
}

const PromptForm: React.FC<PromptFormProps> = ({
  onGenerate,
  initialValues,
  externalPrompt,
  externalReferences,
  assets,
  selectedStyle,
  onSelectStyle,
  continuity,
  onSetContinuity,
  customStyles,
  onAddCustomStyle
}) => {
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? '');
  const [model, setModel] = useState<VeoModel>(initialValues?.model ?? VeoModel.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialValues?.aspectRatio ?? AspectRatio.LANDSCAPE);
  const [resolution, setResolution] = useState<Resolution>(initialValues?.resolution ?? Resolution.P720);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(initialValues?.mode ?? GenerationMode.TEXT_TO_VIDEO);
  const [startFrame, setStartFrame] = useState<ImageFile | null>(initialValues?.startFrame ?? null);
  const [endFrame, setEndFrame] = useState<ImageFile | null>(initialValues?.endFrame ?? null);
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>(initialValues?.referenceImages ?? []);
  const [inputVideo, setInputVideo] = useState<VideoFile | null>(initialValues?.inputVideo ?? null);
  const [inputVideoObject, setInputVideoObject] = useState<Video | null>(initialValues?.inputVideoObject ?? null);
  const [isLooping, setIsLooping] = useState(initialValues?.isLooping ?? false);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'style' | 'continuity' | null>(null);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  // Syncs
  useEffect(() => {
    if (initialValues) {
      setPrompt(initialValues.prompt ?? '');
      setModel(initialValues.model ?? VeoModel.VEO_FAST);
      setAspectRatio(initialValues.aspectRatio ?? AspectRatio.LANDSCAPE);
      setResolution(initialValues.resolution ?? Resolution.P720);
      setGenerationMode(initialValues.mode ?? GenerationMode.TEXT_TO_VIDEO);
      setStartFrame(initialValues.startFrame ?? null);
      setEndFrame(initialValues.endFrame ?? null);
      setReferenceImages(initialValues.referenceImages ?? []);
      setInputVideo(initialValues.inputVideo ?? null);
      setInputVideoObject(initialValues.inputVideoObject ?? null);
      setIsLooping(initialValues.isLooping ?? false);
    }
  }, [initialValues]);

  useEffect(() => {
    if (externalPrompt) setPrompt(externalPrompt);
  }, [externalPrompt]);

  useEffect(() => {
    if (externalReferences && externalReferences.length > 0) {
        setGenerationMode(GenerationMode.REFERENCES_TO_VIDEO);
        setReferenceImages(externalReferences);
    }
  }, [externalReferences]);

  // Adjust config based on mode
  useEffect(() => {
    if (generationMode === GenerationMode.REFERENCES_TO_VIDEO) {
      setModel(VeoModel.VEO);
      setAspectRatio(AspectRatio.LANDSCAPE);
      setResolution(Resolution.P720);
    } else if (generationMode === GenerationMode.EXTEND_VIDEO) {
      setResolution(Resolution.P720);
    }
  }, [generationMode]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [prompt]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setIsModeSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      
      // Inject Style and Continuity into prompt logic
      let finalPrompt = prompt;
      
      // 1. Style Injection
      if (selectedStyle) {
          finalPrompt = `${selectedStyle.promptInjection} ${finalPrompt}`;
      }
      
      // 2. Continuity Injection (Textual)
      const lockedAssets = assets.filter(a => continuity.activeAssetIds.includes(a.id));
      if (lockedAssets.length > 0) {
          const charDescriptions = lockedAssets.map(a => `Character Reference: ${a.prompt}`).join('. ');
          finalPrompt = `${finalPrompt}. ${charDescriptions}.`;
      }
      if (continuity.lightingLock) {
          finalPrompt = `${finalPrompt}. Lighting: ${continuity.lightingLock}.`;
      }

      onGenerate({
        prompt: finalPrompt,
        model,
        aspectRatio,
        resolution,
        mode: generationMode,
        startFrame,
        endFrame,
        referenceImages, // Note: We could also append locked asset images here if Veo supports mix
        inputVideo,
        inputVideoObject,
        isLooping,
      });
    },
    [prompt, model, aspectRatio, resolution, generationMode, startFrame, endFrame, referenceImages, inputVideo, inputVideoObject, isLooping, onGenerate, selectedStyle, continuity, assets]
  );

  const toggleTab = (tab: 'settings' | 'style' | 'continuity') => {
      if (activeTab === tab) {
          setActiveTab(null);
          setIsAdvancedOpen(false);
      } else {
          setActiveTab(tab);
          setIsAdvancedOpen(true);
      }
  };

  return (
    <div className="relative w-full">
      {/* Advanced Panels */}
      {isAdvancedOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-3 animate-fade-in z-20">
            {activeTab === 'settings' && (
                 <div className="glass-panel rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CustomSelect
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value as VeoModel)}
                        icon={<SparklesIcon className="w-5 h-5 text-gray-400" />}
                        disabled={generationMode === GenerationMode.REFERENCES_TO_VIDEO}>
                        {Object.values(VeoModel).map((modelValue) => (
                            <option key={modelValue} value={modelValue}>
                            {modelValue}
                            </option>
                        ))}
                        </CustomSelect>
                        <CustomSelect
                        label="Aspect Ratio"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        icon={<RectangleStackIcon className="w-5 h-5 text-gray-400" />}
                        disabled={generationMode === GenerationMode.REFERENCES_TO_VIDEO || generationMode === GenerationMode.EXTEND_VIDEO}>
                        <option value={AspectRatio.LANDSCAPE}>Landscape (16:9)</option>
                        <option value={AspectRatio.PORTRAIT}>Portrait (9:16)</option>
                        </CustomSelect>
                        <CustomSelect
                        label="Resolution"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as Resolution)}
                        icon={<TvIcon className="w-5 h-5 text-gray-400" />}
                        disabled={generationMode === GenerationMode.REFERENCES_TO_VIDEO || generationMode === GenerationMode.EXTEND_VIDEO}>
                        <option value={Resolution.P720}>720p</option>
                        <option value={Resolution.P1080}>1080p</option>
                        </CustomSelect>
                    </div>
                 </div>
            )}
            {activeTab === 'style' && (
                <StyleSelector 
                    selectedStyle={selectedStyle}
                    onSelectStyle={onSelectStyle}
                    customStyles={customStyles}
                    onAddCustomStyle={onAddCustomStyle}
                />
            )}
            {activeTab === 'continuity' && (
                <ContinuityPanel 
                    assets={assets}
                    continuity={continuity}
                    onToggleAsset={(id) => {
                        onSetContinuity({
                            ...continuity,
                            activeAssetIds: continuity.activeAssetIds.includes(id) 
                                ? continuity.activeAssetIds.filter(x => x !== id)
                                : [...continuity.activeAssetIds, id]
                        });
                    }}
                    onSetLighting={(l) => onSetContinuity({...continuity, lightingLock: l})}
                />
            )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        {/* Helper visual for start/end frames */}
        {generationMode === GenerationMode.FRAMES_TO_VIDEO && (
            <div className="mb-3 p-4 glass-panel rounded-2xl flex justify-center gap-4">
                 <ImageUpload label="Start Frame" image={startFrame} onSelect={setStartFrame} onRemove={() => setStartFrame(null)} />
                 <ImageUpload label="End Frame" image={endFrame} onSelect={setEndFrame} onRemove={() => setEndFrame(null)} />
            </div>
        )}
        
        {/* Main Bar */}
        <div className="flex items-end gap-2 glass-panel p-2 rounded-2xl relative shadow-2xl bg-[#2F3E32]/80 backdrop-blur-xl border border-white/20">
          
          {/* Mode Selector */}
          <div className="relative" ref={modeSelectorRef}>
            <button
              type="button"
              onClick={() => setIsModeSelectorOpen((prev) => !prev)}
              className="flex shrink-0 items-center gap-2 px-3 py-3 rounded-xl hover:bg-white/10 text-gray-200 transition-colors"
            >
              {generationMode === GenerationMode.TEXT_TO_VIDEO && <TextModeIcon className="w-5 h-5" />}
              {generationMode === GenerationMode.FRAMES_TO_VIDEO && <FramesModeIcon className="w-5 h-5" />}
              {generationMode === GenerationMode.REFERENCES_TO_VIDEO && <ReferencesModeIcon className="w-5 h-5" />}
              {generationMode === GenerationMode.EXTEND_VIDEO && <FilmIcon className="w-5 h-5" />}
              <span className="font-medium text-xs hidden sm:inline">{generationMode}</span>
            </button>
            {isModeSelectorOpen && (
              <div className="absolute bottom-full mb-2 w-56 glass-panel rounded-xl overflow-hidden z-30">
                {[GenerationMode.TEXT_TO_VIDEO, GenerationMode.FRAMES_TO_VIDEO, GenerationMode.REFERENCES_TO_VIDEO].map((m) => (
                  <button key={m} type="button" onClick={() => { setGenerationMode(m); setIsModeSelectorOpen(false); }} className="w-full text-left p-3 hover:bg-white/10 text-xs text-gray-200 block">
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
                selectedStyle 
                ? `Describe scene in "${selectedStyle.name}" style...`
                : "Describe your scene..."
            }
            className="flex-grow bg-transparent focus:outline-none resize-none text-sm text-white placeholder-white/30 max-h-40 py-3 min-w-0 font-light"
            rows={1}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
             <button
                type="button"
                onClick={() => toggleTab('style')}
                className={`p-2.5 rounded-full transition-all ${activeTab === 'style' ? 'bg-[#D4A373] text-[#2F3E32]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                title="Cinematographer Style"
             >
                 <FilmIcon className="w-5 h-5" />
             </button>
             <button
                type="button"
                onClick={() => toggleTab('continuity')}
                className={`p-2.5 rounded-full transition-all ${activeTab === 'continuity' ? 'bg-[#E07A5F] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                title="Continuity Anchors"
             >
                 <div className="relative">
                     <FramesModeIcon className="w-5 h-5" />
                     {continuity.activeAssetIds.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#E07A5F] rounded-full border border-[#2F3E32]"></span>}
                 </div>
             </button>
             <button
                type="button"
                onClick={() => toggleTab('settings')}
                className={`p-2.5 rounded-full transition-all ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
             >
                 <SlidersHorizontalIcon className="w-5 h-5" />
             </button>
             <button
                type="submit"
                disabled={!prompt.trim()}
                className="p-3 bg-[#E35336] hover:bg-[#c4442b] rounded-full text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ml-2"
             >
                 <ArrowRightIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;