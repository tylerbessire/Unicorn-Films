/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Asset, ContinuityProfile } from '../types';
import { KeyIcon, SlidersHorizontalIcon, SparklesIcon } from './icons';

interface ContinuityPanelProps {
    assets: Asset[];
    continuity: ContinuityProfile;
    onToggleAsset: (assetId: string) => void;
    onSetLighting: (lighting: string | null) => void;
}

const ContinuityPanel: React.FC<ContinuityPanelProps> = ({
    assets,
    continuity,
    onToggleAsset,
    onSetLighting
}) => {
    const characters = assets.filter(a => a.type === 'character');
    const environments = assets.filter(a => a.type === 'environment');

    return (
        <div className="bg-[#2F3E32]/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 w-full">
            <h3 className="text-sm font-bold text-[#E07A5F] uppercase tracking-widest flex items-center gap-2 mb-4">
                <KeyIcon className="w-4 h-4" />
                Continuity Anchors
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Character Lock */}
                <div>
                    <h4 className="text-xs font-semibold text-white/50 mb-2 uppercase">Cast Lock</h4>
                    {characters.length === 0 ? (
                        <p className="text-[10px] text-white/30 italic">No characters in bin.</p>
                    ) : (
                        <div className="space-y-2">
                            {characters.map(char => (
                                <label key={char.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={continuity.activeAssetIds.includes(char.id)}
                                        onChange={() => onToggleAsset(char.id)}
                                        className="w-4 h-4 rounded border-gray-500 text-[#E07A5F] focus:ring-[#E07A5F] bg-transparent"
                                    />
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                        <img src={char.imageUrl} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-xs ${continuity.activeAssetIds.includes(char.id) ? 'text-white font-medium' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                        {char.prompt.slice(0, 20)}...
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lighting Lock */}
                <div>
                    <h4 className="text-xs font-semibold text-white/50 mb-2 uppercase">Atmosphere Lock</h4>
                    <div className="space-y-2">
                         {['Golden Hour', 'Cyberpunk Neon', 'Overcast/Moody', 'Studio High Key'].map(light => (
                             <button
                                key={light}
                                onClick={() => onSetLighting(continuity.lightingLock === light ? null : light)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                                    continuity.lightingLock === light 
                                    ? 'bg-[#E07A5F] border-[#E07A5F] text-white' 
                                    : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                                }`}
                             >
                                 {light}
                             </button>
                         ))}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-white/40 flex items-center gap-2">
                <SparklesIcon className="w-3 h-3" />
                <span>Selected anchors will be enforced in every generation.</span>
            </div>
        </div>
    );
};

export default ContinuityPanel;
