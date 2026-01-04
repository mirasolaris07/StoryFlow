import React, { useState } from 'react';
import { DialogueBoxStyle } from '../types';
import { uploadAsset } from '../services/api';
import { X, Check, Upload, Image as ImageIcon, Palette, type LucideIcon } from 'lucide-react';

interface DialogueStylerProps {
    style: DialogueBoxStyle;
    onUpdate: (style: DialogueBoxStyle) => void;
    onClose: () => void;
}

export const DialogueStyler: React.FC<DialogueStylerProps> = ({ style, onUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState<'BOX' | 'CHOICE'>('BOX');

    // Helper to get current target config
    const currentImageConfig = activeTab === 'BOX' ? style.borderImage : style.optionButtonImage;

    const updateImageConfig = (updates: Partial<typeof style.borderImage>) => {
        if (activeTab === 'BOX') {
            onUpdate({ ...style, borderImage: { ...style.borderImage || { source: '', slice: 30, width: 30, repeat: 'round' }, ...updates } as any });
        } else {
            onUpdate({ ...style, optionButtonImage: { ...style.optionButtonImage || { source: '', slice: 30, width: 30, repeat: 'round' }, ...updates } as any });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            <div className="w-[800px] h-[600px] bg-slate-900 border border-slate-700 rounded-3xl flex overflow-hidden shadow-2xl relative">

                {/* Visual Preview Area */}
                <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-end p-10">
                    <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=2574')] bg-cover bg-center grayscale" />

                    {activeTab === 'BOX' ? (
                        <div
                            className="relative w-full rounded-xl p-6 backdrop-blur-md transition-all duration-300"
                            style={{
                                background: style.bgType === 'GRADIENT'
                                    ? `linear-gradient(${style.gradient?.direction || 'to bottom'}, ${style.gradient?.colors[0] || '#000000'}, ${style.gradient?.colors[1] || '#000000'})`
                                    : (style.bgType === 'IMAGE' ? 'transparent' : style.boxColor),
                                border: style.bgType === 'IMAGE' ? `${style.borderImage?.width || 30}px solid transparent` : undefined,
                                borderImageSource: style.bgType === 'IMAGE' && style.borderImage?.source ? `url(${style.borderImage.source})` : undefined,
                                borderImageSlice: style.bgType === 'IMAGE' ? `${style.borderImage?.slice || 30} fill` : undefined,
                                borderImageRepeat: style.bgType === 'IMAGE' ? (style.borderImage?.repeat || 'round') : undefined,
                                backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
                                WebkitBackdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
                                opacity: style.opacity,
                                bottom: `${style.yPosition}%`,
                                height: `${style.height}vh`,
                                width: `${style.width ?? 90}%`,
                                left: `${style.xPosition ?? 50}%`,
                                transform: 'translateX(-50%)',
                                boxShadow: style.bgType !== 'IMAGE' ? '0 8px 32px rgba(0,0,0,0.3)' : undefined
                            }}
                        >
                            <div className="relative z-10 h-full flex flex-col gap-2">
                                <h3 className="font-bold uppercase tracking-widest text-lg" style={{ color: style.textColor, fontFamily: style.fontFamily }}>Character Name</h3>
                                <p className="text-xl leading-relaxed" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                    "This is how your dialogue will look in the final game."
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
                            <h3 className="text-center font-black text-slate-500 uppercase tracking-widest mb-4">Choice Preview</h3>
                            {[1, 2].map(i => (
                                <div
                                    key={i}
                                    className="w-full p-4 rounded-xl text-left transition-all border border-white/5 flex items-center justify-between group"
                                    style={{
                                        border: style.optionButtonImage?.source ? `${style.optionButtonImage.width}px solid transparent` : '1px solid rgba(255,255,255,0.1)',
                                        borderImageSource: style.optionButtonImage?.source ? `url(${style.optionButtonImage.source})` : undefined,
                                        borderImageSlice: style.optionButtonImage?.source ? `${style.optionButtonImage.slice} fill` : undefined,
                                        borderImageRepeat: style.optionButtonImage?.source ? (style.optionButtonImage.repeat || 'round') : undefined,
                                        background: !style.optionButtonImage?.source ? 'rgba(255,255,255,0.05)' : undefined
                                    }}
                                >
                                    <span className="font-bold text-lg text-white">Example Choice {i}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-300 uppercase tracking-widest">UI Theme</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"><X size={18} /></button>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('BOX')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'BOX' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Dialogue Box
                        </button>
                        <button
                            onClick={() => setActiveTab('CHOICE')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'CHOICE' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Choices
                        </button>
                    </div>

                    <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">

                        {activeTab === 'BOX' && (
                            <>
                                {/* Background Type */}
                                <div className="space-y-3 pb-4 border-b border-slate-800">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Box Style</label>
                                    <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                                        {['COLOR', 'GRADIENT', 'IMAGE'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => onUpdate({ ...style, bgType: t as any })}
                                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${(style.bgType || 'COLOR') === t
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* General Sliders for BOX only */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Vertical Position</span>
                                        <span>{style.yPosition}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="50" step="1"
                                        value={style.yPosition}
                                        onChange={e => onUpdate({ ...style, yPosition: parseInt(e.target.value) })}
                                        className="w-full accent-blue-600 bg-slate-800 rounded-lg h-2 appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Box Height</span>
                                        <span>{style.height ?? 30}%</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="100" step="1"
                                        value={style.height ?? 30}
                                        onChange={e => onUpdate({ ...style, height: parseInt(e.target.value) })}
                                        className="w-full accent-blue-600 bg-slate-800 rounded-lg h-2 appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Box Width</span>
                                        <span>{style.width ?? 100}%</span>
                                    </div>
                                    <input
                                        type="range" min="20" max="100" step="1"
                                        value={style.width ?? 100}
                                        onChange={e => onUpdate({ ...style, width: parseInt(e.target.value) })}
                                        className="w-full accent-blue-600 bg-slate-800 rounded-lg h-2 appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Horizontal Position</span>
                                        <span>{style.xPosition ?? 50}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100" step="1"
                                        value={style.xPosition ?? 50}
                                        onChange={e => onUpdate({ ...style, xPosition: parseInt(e.target.value) })}
                                        className="w-full accent-blue-600 bg-slate-800 rounded-lg h-2 appearance-none cursor-pointer"
                                    />
                                </div>
                            </>
                        )}

                        {/* SHARED 9-SLICE CONTROLS (But context aware) */}
                        {((activeTab === 'BOX' && style.bgType === 'IMAGE') || activeTab === 'CHOICE') && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon size={12} /> Custom 9-Slice Asset
                                </label>

                                <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 relative overflow-hidden transition-all group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <Upload size={14} /> {currentImageConfig?.source ? 'Replace Image' : 'Upload Image'}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                                const url = await uploadAsset(e.target.files[0], 'UI');
                                                updateImageConfig({ source: url });
                                            }
                                        }}
                                    />
                                </button>

                                {currentImageConfig?.source && (
                                    <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-1 uppercase">Slice (Px)</label>
                                            <input type="number" value={currentImageConfig.slice || 30}
                                                onChange={e => updateImageConfig({ slice: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-1 uppercase">Width (Px)</label>
                                            <input type="number" value={currentImageConfig.width || 30}
                                                onChange={e => updateImageConfig({ width: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[9px] text-slate-500 font-bold block mb-1 uppercase">Repeat Mode</label>
                                            <select
                                                value={currentImageConfig.repeat || 'round'}
                                                onChange={e => updateImageConfig({ repeat: e.target.value as any })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none"
                                            >
                                                <option value="stretch">Stretch</option>
                                                <option value="repeat">Repeat</option>
                                                <option value="round">Round (Best)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FONT CONTROLS (Shared) */}
                        <div className="pt-4 border-t border-slate-800 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Typography</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={style.textColor}
                                    onChange={e => onUpdate({ ...style, textColor: e.target.value })}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <select
                                    value={style.fontFamily}
                                    onChange={e => onUpdate({ ...style, fontFamily: e.target.value })}
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-300 outline-none"
                                >
                                    <option value="Inter, sans-serif">Modern Sans</option>
                                    <option value="serif">Classic Serif</option>
                                    <option value="monospace">Digital Mono</option>
                                </select>
                            </div>
                        </div>

                    </div>

                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                        <Check size={16} /> Save Theme
                    </button>
                </div>
            </div>
        </div>
    );
};
