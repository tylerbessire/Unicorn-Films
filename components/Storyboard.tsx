/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';
import { Asset, Scene } from '../types';
import { ArrowRightIcon, PlusIcon, TrashIcon, XMarkIcon } from './icons';

interface StoryboardProps {
    assets: Asset[];
    onInjectToTimeline: (sceneData: any) => void;
}

interface BoardItem {
    id: string;
    assetId: string;
    x: number;
    y: number;
    note: string;
}

const Storyboard: React.FC<StoryboardProps> = ({ assets, onInjectToTimeline }) => {
    const [items, setItems] = useState<BoardItem[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggingId && boardRef.current) {
            const rect = boardRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - 50; // offset to center
            const y = e.clientY - rect.top - 50;

            setItems(prev => prev.map(item => 
                item.id === draggingId ? { ...item, x, y } : item
            ));
            setDraggingId(null);
        }
    };

    const addItem = (assetId: string) => {
        const newItem: BoardItem = {
            id: globalThis.crypto?.randomUUID() ?? Date.now().toString(),
            assetId,
            x: Math.random() * 400 + 50,
            y: Math.random() * 300 + 50,
            note: "Scene Note..."
        };
        setItems(prev => [...prev, newItem]);
    };

    const updateNote = (id: string, text: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, note: text } : item));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleExecute = () => {
        if(items.length === 0) return;
        // Mock injection logic - in real app would parse the board
        const prompt = items.map(i => {
             const asset = assets.find(a => a.id === i.assetId);
             return `${asset?.prompt || 'Object'} (${i.note})`;
        }).join(' next to ');
        
        onInjectToTimeline({ prompt });
        alert("Storyboard executed and injected into Director's Prompt!");
    };

    return (
        <div className="flex h-full w-full">
            {/* Board Canvas */}
            <div className="flex-1 relative bg-[#0f0f11] overflow-hidden" ref={boardRef} onDragOver={handleDragOver} onDrop={handleDrop}>
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>
                
                <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded-lg border border-gray-700/50 backdrop-blur-md">
                    <h2 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Storybuilder Board V1.0</h2>
                </div>

                <div className="absolute top-4 right-4 z-10">
                     <button 
                        onClick={handleExecute}
                        disabled={items.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-mono flex items-center gap-2 shadow-lg"
                    >
                        EXECUTE SCENE <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>

                {items.map(item => {
                    const asset = assets.find(a => a.id === item.assetId);
                    if (!asset) return null;
                    return (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            style={{ left: item.x, top: item.y }}
                            className="absolute w-32 cursor-move group"
                        >
                            <div className="relative bg-white p-1 shadow-xl transform rotate-1 transition-transform group-hover:scale-105">
                                <img src={asset.imageUrl} className="w-full h-24 object-cover grayscale contrast-125" alt="" />
                                <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </div>
                            <input 
                                value={item.note}
                                onChange={(e) => updateNote(item.id, e.target.value)}
                                className="w-full mt-2 bg-transparent text-center font-handwriting text-yellow-300 text-lg focus:outline-none"
                            />
                            {/* Connection Lines (Visual Mock) */}
                             <div className="absolute top-1/2 -right-full w-full h-px border-t-2 border-dashed border-white/20 pointer-events-none"></div>
                        </div>
                    );
                })}

                {items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-gray-700 font-mono text-sm">
                            DRAG ASSETS FROM THE DRAWER TO BUILD SCENE
                        </div>
                    </div>
                )}
            </div>

            {/* Mini Drawer for Storyboard */}
            <div className="w-20 bg-[#161617] border-l border-gray-800 flex flex-col items-center py-4 gap-4 overflow-y-auto z-20">
                 <div className="text-[10px] text-gray-500 font-mono rotate-90 whitespace-nowrap mb-4">ASSETS</div>
                 {assets.map(asset => (
                     <div key={asset.id} onClick={() => addItem(asset.id)} className="w-12 h-12 rounded border border-gray-700 cursor-pointer hover:border-indigo-500 overflow-hidden shrink-0">
                         <img src={asset.imageUrl} className="w-full h-full object-cover" />
                     </div>
                 ))}
                 <button className="w-12 h-12 rounded border border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:text-gray-400">
                     <PlusIcon className="w-5 h-5" />
                 </button>
            </div>
        </div>
    );
};

export default Storyboard;