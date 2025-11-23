/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { FilmStyle } from '../types';
import { FilmIcon, PlusIcon, XMarkIcon } from './icons';

export const HOLLYWOOD_STYLES: FilmStyle[] = [
    {
        id: 'blockbuster',
        name: 'Blockbuster Action',
        category: 'Hollywood',
        description: 'Michael Bay/Marvel Style: High Contrast, Teal & Orange.',
        promptInjection: "Cinematic lighting, high octane atmosphere, teal and orange color grading, shot on ARRI Alexa LF, anamorphic lens flares, shallow depth of field, highly detailed textures, volumetric fog, rim lighting on characters, 8k resolution, IMAX quality, hyper-realistic."
    },
    {
        id: 'prestige',
        name: 'Prestige Drama',
        category: 'Hollywood',
        description: 'A24/Oscar Contender: Naturalistic, Moody, Soft.',
        promptInjection: "A24 film aesthetic, shot on 35mm Kodak Portra 400, film grain, soft natural window lighting, emotional atmosphere, muted color palette, raw and gritty realism, cinematographer Roger Deakins style, deep shadows, composition using rule of thirds, sharp focus on eyes."
    },
    {
        id: 'neonoir',
        name: 'Neo-Noir Sci-Fi',
        category: 'Hollywood',
        description: 'Blade Runner/Cyberpunk: Dark, Neon, Wet.',
        promptInjection: "Futuristic noir atmosphere, wet streets reflecting neon signs, heavy rain, volumetric smoke, cybernetic details, pink and blue distinct color palette, low key lighting, silhouette shots, shot on RED Komodo, highly detailed blurred background, dystopian aesthetic."
    },
    {
        id: 'period',
        name: 'Period Piece',
        category: 'Hollywood',
        description: 'Bridgerton/Pride & Prejudice: Warm, Soft, Painterly.',
        promptInjection: "Historical film aesthetic, golden hour lighting, soft diffusion filter, opulent costume design, intricate details, warm pastel color grading, shot on 70mm film, painterly composition, romantic atmosphere, sparkling highlights, grand scale."
    },
    {
        id: 'thriller',
        name: 'Psychological Thriller',
        category: 'Hollywood',
        description: 'Fincher/Silence of the Lambs: Cold, Green/Yellow Tint.',
        promptInjection: "Fincher-esque visual style, controlled camera movement, low contrast, greenish-yellow color grading, fluorescent lighting, clinical atmosphere, sterile environment, extreme detail, unnerving composition, shot on digital cinema camera, sharp edge definition."
    }
];

interface StyleSelectorProps {
    selectedStyle: FilmStyle | null;
    onSelectStyle: (style: FilmStyle | null) => void;
    customStyles: FilmStyle[];
    onAddCustomStyle: (style: FilmStyle) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ 
    selectedStyle, 
    onSelectStyle, 
    customStyles, 
    onAddCustomStyle 
}) => {
    const [isImporting, setIsImporting] = useState(false);
    const [importText, setImportText] = useState('');
    const [importName, setImportName] = useState('');

    const handleImport = () => {
        if(!importText.trim() || !importName.trim()) return;
        
        const newStyle: FilmStyle = {
            id: Date.now().toString(),
            name: importName,
            category: 'Custom',
            description: 'Imported Markdown Style',
            promptInjection: importText
        };
        onAddCustomStyle(newStyle);
        setImportText('');
        setImportName('');
        setIsImporting(false);
    };

    return (
        <div className="bg-[#2F3E32]/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 w-full">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-[#D4A373] uppercase tracking-widest flex items-center gap-2">
                     <FilmIcon className="w-4 h-4" />
                     The Cinematographer
                 </h3>
                 <button 
                    onClick={() => setIsImporting(!isImporting)}
                    className="text-xs flex items-center gap-1 text-white/70 hover:text-white"
                 >
                    <PlusIcon className="w-3 h-3" /> Import Style
                 </button>
             </div>

             {isImporting && (
                 <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/10 animate-fade-in">
                     <input 
                        className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-sm text-white mb-2 focus:outline-none focus:border-[#D4A373]"
                        placeholder="Style Name (e.g. Wes Anderson)"
                        value={importName}
                        onChange={e => setImportName(e.target.value)}
                     />
                     <textarea 
                        className="w-full bg-transparent border border-white/20 rounded p-2 text-xs text-white/80 h-20 mb-2 focus:outline-none focus:border-[#D4A373]"
                        placeholder="Paste markdown or prompt description here..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                     />
                     <div className="flex justify-end gap-2">
                         <button onClick={() => setIsImporting(false)} className="text-xs text-white/50 hover:text-white">Cancel</button>
                         <button onClick={handleImport} className="text-xs bg-[#D4A373] text-[#2F3E32] px-3 py-1 rounded font-bold">Add Style</button>
                     </div>
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                 {[...HOLLYWOOD_STYLES, ...customStyles].map(style => (
                     <button
                        key={style.id}
                        onClick={() => onSelectStyle(selectedStyle?.id === style.id ? null : style)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                            selectedStyle?.id === style.id 
                            ? 'bg-[#D4A373] border-[#D4A373] text-[#2F3E32]' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                     >
                         <div className="text-xs font-bold truncate">{style.name}</div>
                         <div className={`text-[10px] truncate mt-1 ${selectedStyle?.id === style.id ? 'text-[#2F3E32]/80' : 'text-gray-500'}`}>
                             {style.description}
                         </div>
                     </button>
                 ))}
             </div>
        </div>
    );
};

export default StyleSelector;
