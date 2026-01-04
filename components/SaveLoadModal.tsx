import React, { useEffect, useState } from 'react';
import { SaveSlot, GameState } from '../types';
import { saveGame, loadGame, listSaves, deleteSave } from '../utils/saveManager';
import { Save, Trash2, Clock, MapPin, X, Loader2 } from 'lucide-react';

interface SaveLoadModalProps {
    mode: 'SAVE' | 'LOAD';
    gameState?: GameState;
    currentLocationName?: string;
    onClose: () => void;
    onLoad?: (slot: SaveSlot) => void;
    onSave?: (slot: SaveSlot) => void;
}

export const SaveLoadModal = ({ mode, gameState, currentLocationName, onClose, onLoad, onSave }: SaveLoadModalProps) => {
    const [slots, setSlots] = useState<(SaveSlot | null)[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        refreshSlots();
    }, []);

    const refreshSlots = () => {
        setLoading(true);
        // Simulate async for realism or if we move to file system later
        setTimeout(() => {
            setSlots(listSaves());
            setLoading(false);
        }, 300);
    };

    const handleSlotClick = (slotId: number) => {
        if (mode === 'SAVE' && gameState) {
            if (confirm(`Overwrite Slot ${slotId}?`)) {
                const saved = saveGame(slotId, gameState, currentLocationName || "Unknown Location", 0); // PlayTime TODO
                refreshSlots();
                onSave?.(saved);
            }
        } else if (mode === 'LOAD') {
            const slot = slots[slotId - 1]; // slots are 0-indexed in array but 1-indexed IDs
            if (slot) {
                if (confirm(`Load Slot ${slotId}? Unsaved progress will be lost.`)) {
                    onLoad?.(slot);
                    onClose();
                }
            }
        }
    };

    const handleDelete = (e: React.MouseEvent, slotId: number) => {
        e.stopPropagation();
        if (confirm("Delete this save?")) {
            deleteSave(slotId);
            refreshSlots();
        }
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[800px] bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                    <Save className="text-blue-500" />
                    {mode === 'SAVE' ? 'Save Game' : 'Load Game'}
                </h2>

                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 gap-2">
                        <Loader2 className="animate-spin" /> Loading Slots...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => {
                            const slotId = idx + 1;
                            const slot = slots[idx];

                            return (
                                <div
                                    key={slotId}
                                    onClick={() => handleSlotClick(slotId)}
                                    className={`relative h-32 rounded-xl border-2 transition-all cursor-pointer group flex overflow-hidden
                    ${slot
                                            ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20'
                                            : 'bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-600 hover:bg-slate-800/50'
                                        }`}
                                >
                                    {/* Empty State */}
                                    {!slot && (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-bold uppercase tracking-widest text-xs group-hover:text-slate-400">
                                            Empty Slot {slotId}
                                        </div>
                                    )}

                                    {/* Filled State */}
                                    {slot && (
                                        <>
                                            {/* Thumbnail Placeholder */}
                                            <div className="w-1/3 bg-slate-950 flex items-center justify-center border-r border-slate-700/50">
                                                {slot.thumbnail ? (
                                                    <img src={slot.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                                ) : (
                                                    <Clock size={24} className="text-slate-700" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 p-4 flex flex-col justify-between">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">Slot {slotId}</div>
                                                    <div className="text-sm font-bold text-white leading-tight line-clamp-1">{slot.locationName}</div>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                    <span>{new Date(slot.timestamp).toLocaleDateString()}</span>
                                                    <button
                                                        onClick={(e) => handleDelete(e, slotId)}
                                                        className="p-1.5 hover:bg-rose-900/30 hover:text-rose-400 rounded transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
