import React from 'react';
import { NodeType } from '../types';
import { Play, MessageSquare, Split, Flag, Box, Lock, Sliders, LayoutTemplate, Loader2, Share2, Download, Zap, FileText, FolderOpen, Upload, Trash2 } from 'lucide-react';

interface SecondarySidebarProps {
    type: 'library' | 'publish' | null;
    onClose: () => void;
    onExport?: (format: 'json' | 'yaml' | 'storyline' | 'storyline_yaml' | 'storyline_md') => void;
    onBuild?: () => Promise<void>;
    onImport?: () => void;
    onReset?: () => void;
    isBuilding?: boolean;
}

export const SecondarySidebar: React.FC<SecondarySidebarProps> = ({
    type,
    onClose,
    onExport,
    onBuild,
    onImport,
    onReset,
    isBuilding
}) => {
    if (!type) return null;

    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="absolute left-72 top-0 bottom-0 w-80 bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-[15] flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {type === 'library' ? 'Node Library' : 'Publishing'}
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                >
                    <LayoutTemplate size={16} className="rotate-90" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {type === 'library' ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { type: NodeType.START, label: 'Start', icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                { type: NodeType.SCENE, label: 'Scene', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                { type: NodeType.LOGIC, label: 'Logic', icon: Split, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                                { type: NodeType.SETTER, label: 'Setter', icon: Sliders, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                                { type: NodeType.SUPER, label: 'Route', icon: Box, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                                { type: NodeType.END, label: 'End', icon: Flag, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                            ].map((node) => (
                                <div
                                    key={node.type}
                                    className={`group flex flex-col gap-3 p-4 bg-white/5 border ${node.border} rounded-2xl cursor-grab active:cursor-grabbing hover:bg-white/10 hover:scale-[1.02] transition-all hover:shadow-2xl hover:shadow-black/40`}
                                    onDragStart={(event) => onDragStart(event, node.type)}
                                    draggable
                                >
                                    <div className={`w-10 h-10 ${node.bg} ${node.color} flex items-center justify-center rounded-xl transition-transform group-hover:scale-110`}>
                                        <node.icon size={20} />
                                    </div>
                                    <div className="text-[12px] font-bold text-slate-200 tracking-tight">{node.label}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 italic text-center px-4 leading-relaxed">
                            Drag and drop nodes onto the Story Map to design your narrative flow.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Section 1: Production Release */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                                <Zap size={12} className="text-emerald-500" />
                                Production Hub
                            </h4>
                            <div className="p-5 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-emerald-400/80">Stable Release</span>
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full uppercase">EXE</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (isBuilding) return;
                                        onBuild ? await onBuild() : alert("Build system not linked.");
                                    }}
                                    disabled={isBuilding}
                                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-[12px] tracking-widest uppercase shadow-2xl ${isBuilding
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 ring-1 ring-emerald-400/30 active:scale-95'
                                        }`}
                                >
                                    {isBuilding ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                    {isBuilding ? 'Compiling...' : 'Generate Build'}
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Narrative & Suite */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                                <FileText size={12} className="text-pink-400" />
                                Narrative Suite
                            </h4>
                            <div className="space-y-3">
                                <button
                                    onClick={() => onExport?.('storyline_md')}
                                    className="w-full flex items-center gap-4 p-5 bg-pink-500/5 hover:bg-pink-500/10 rounded-3xl border border-pink-500/10 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-black uppercase tracking-widest text-pink-400">Playwright</div>
                                        <div className="text-[10px] text-pink-300/60 font-medium mt-1">Export formatted screenplay</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onExport?.('storyline_yaml')}
                                    className="group w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-600/5 hover:bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Zap size={18} className="text-indigo-400" />
                                        <div className="text-left">
                                            <div className="text-[12px] font-bold text-slate-200 tracking-tight">Logic Sync</div>
                                            <div className="text-[9px] text-slate-500 font-medium">Export optimized engine data</div>
                                        </div>
                                    </div>
                                    <Share2 size={14} className="opacity-40" />
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Storage & Maintenance */}
                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                                <FolderOpen size={12} className="text-blue-400" />
                                Archive & Recovery
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onExport?.('json')}
                                    className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 transition-all text-center"
                                >
                                    <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Export JSON</span>
                                </button>
                                <button
                                    onClick={onImport}
                                    className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 transition-all text-center"
                                >
                                    <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Import JSON</span>
                                </button>
                            </div>

                            <button
                                onClick={onReset}
                                className="w-full flex items-center justify-center gap-2 p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest"
                            >
                                <Trash2 size={12} />
                                Destructive Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
