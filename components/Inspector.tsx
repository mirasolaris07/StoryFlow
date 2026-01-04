
import React, { useState, useRef } from 'react';
import { SceneEvent, NodeData, EventType, Character, Attribute, AudioAsset } from '../types';
import { uploadAsset } from '../services/api';
import { StagePreview } from './StagePreview';
import { resolveImageUrl } from './GamePreview';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ConditionBuilder } from './ConditionBuilder';
import { Plus, Trash2, Volume2, Save, X, Sparkles, Sliders, Music, Zap, User, UserPlus, UserMinus, Eye, EyeOff, Maximize, Check, ImageIcon, Repeat, Upload, Loader2, GripHorizontal, AlertTriangle, LayoutTemplate, Mic } from 'lucide-react';
import { Node } from 'reactflow';

interface InspectorProps {
  selectedNode: any;
  nodes: Node[]; // Add nodes prop
  characters: Character[];
  gameAttributes: Attribute[];
  audioAssets: AudioAsset[];
  onUpdate: (id: string, data: Partial<NodeData>) => void;
  onDeselect?: () => void;
  onOpenSceneEditor?: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, nodes, characters, gameAttributes, audioAssets, onUpdate, onDeselect, onOpenSceneEditor }) => {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  console.log("Inspector Render. Selected:", selectedNode?.id);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <div className="w-full aspect-video border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center bg-slate-900/50">
          <Sliders size={32} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-[10px] uppercase tracking-widest opacity-40">Select node to edit</p>
        </div>
      </div>
    );
  }

  const data = selectedNode.data as NodeData;

  const addEvent = (type: EventType = EventType.DIALOGUE) => {
    const newEvent: SceneEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      characterId: (type === EventType.DIALOGUE || type === EventType.CHAR_ENTER || type === EventType.CHAR_EXIT) ? characters[0]?.id : undefined,
      text: (type === EventType.DIALOGUE || type === EventType.NARRATION) ? 'Enter text...' : undefined,
      attributeTargetId: type === EventType.ATTR_MOD ? gameAttributes[0]?.id : undefined,
      attributeValue: 0,
      operation: 'ADD',
      visible: true,
      loop: type === EventType.MUSIC_CHANGE ? true : undefined,
      x: 50,
      y: 50
    };
    onUpdate(selectedNode.id, { events: [...(data.events || []), newEvent] });
  };

  const updateEvent = (eventId: string, updates: Partial<SceneEvent>) => {
    const newEvents = data.events.map(e => e.id === eventId ? { ...e, ...updates } : e);
    onUpdate(selectedNode.id, { events: newEvents });
  };

  const removeEvent = (eventId: string) => {
    onUpdate(selectedNode.id, { events: data.events.filter(e => e.id !== eventId) });
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadAsset(file, 'Scene');
      onUpdate(selectedNode.id, { backgroundImage: url });
    } catch (err) {
      alert("Upload failed. Check server.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onDeselect} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500"><X size={16} /></button>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedNode.type} CONFIG</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onDeselect} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
            <Check size={14} /> Done
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

        {/* Stage Preview for SCENE nodes */}
        {selectedNode.type === 'SCENE' && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/20">
            <StagePreview
              data={data}
              characters={characters}
              onUpdateEvent={(eventId, updates) => {
                const newEvents = data.events.map(e => e.id === eventId ? { ...e, ...updates } : e);
                onUpdate(selectedNode.id, { events: newEvents });
              }}
              onOpenEditor={onOpenSceneEditor}
            />
          </div>
        )}

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                {selectedNode.type === 'LOGIC' ? 'Logic Block Name' : 'Scene Title'}
              </label>
              <input
                type="text" value={data.title}
                onChange={e => onUpdate(selectedNode.id, { title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all font-bold"
              />
              {selectedNode.type === 'LOGIC' && (
                <textarea
                  value={data.description || ''}
                  onChange={e => onUpdate(selectedNode.id, { description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 focus:ring-1 focus:ring-amber-500 outline-none transition-all min-h-[60px]"
                  placeholder="Describe decision logic (e.g. 'Check if player has sword')..."
                />
              )}
              {selectedNode.type === 'LOGIC' && (
                <textarea
                  value={data.description || ''}
                  onChange={e => onUpdate(selectedNode.id, { description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 focus:ring-1 focus:ring-amber-500 outline-none transition-all min-h-[60px]"
                  placeholder="Describe decision logic (e.g. 'Check if player has sword')..."
                />
              )}
            </div>

            {(selectedNode.type === 'SCENE' || selectedNode.type === 'MENU') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Environment / Background</label>
                <div className="flex flex-col gap-3">
                  {data.backgroundImage && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black">
                      <img src={resolveImageUrl(data.backgroundImage)} className="w-full h-full object-cover" />
                      <button onClick={() => onUpdate(selectedNode.id, { backgroundImage: '' })} className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                    <button onClick={() => bgInputRef.current?.click()} disabled={isUploading} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Background
                    </button>
                    <button
                      onClick={() => onUpdate(selectedNode.id, { backgroundScaling: data.backgroundScaling === 'FIXED' ? 'COVER' : 'FIXED' })}
                      className={`px-4 rounded-xl border border-slate-800 transition-colors ${data.backgroundScaling === 'FIXED' ? 'bg-blue-600 text-white border-blue-500' : 'text-slate-500 bg-slate-950 hover:bg-slate-800'}`}
                      title="Toggle Fixed/Cover"
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <input
                      type="text" value={data.backgroundImage?.startsWith('data:') ? 'Local Image Data' : (data.backgroundImage || '')}
                      placeholder="Or enter URL..."
                      disabled={data.backgroundImage?.startsWith('data:')}
                      onChange={e => onUpdate(selectedNode.id, { backgroundImage: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-3 text-[10px] text-slate-400 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MENU SPECIFIC SETTINGS */}
            {selectedNode.type === 'MENU' && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <LayoutTemplate size={12} /> Menu Configuration
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Game Title</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                      placeholder="e.g. The Dark Forest"
                      value={data.title || ''}
                      onChange={(e) => onUpdate(selectedNode.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Subtitle</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 outline-none focus:border-indigo-500 transition-colors"
                      placeholder="e.g. Chapter 1"
                      value={data.subtitle || ''}
                      onChange={(e) => onUpdate(selectedNode.id, { subtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Menu Music</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors"
                      value={data.backgroundMusic || ''}
                      onChange={(e) => onUpdate(selectedNode.id, { backgroundMusic: e.target.value })}
                    >
                      <option value="">No Music</option>
                      {audioAssets.filter(a => a.type === 'BGM' || !a.type).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedNode.type === 'SCENE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Story Timeline</label>
                  <div className="flex gap-1">
                    <button onClick={() => addEvent(EventType.DIALOGUE)} className="p-2 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="Add Dialogue"><User size={14} /></button>
                    <button onClick={() => addEvent(EventType.CHAR_ENTER)} className="p-2 bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Add Actor"><UserPlus size={14} /></button>
                    <button onClick={() => addEvent(EventType.CHAR_EXIT)} className="p-2 bg-rose-600/10 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all" title="Remove Actor"><UserMinus size={14} /></button>
                    <button onClick={() => addEvent(EventType.ATTR_MOD)} className="p-2 bg-amber-600/10 text-amber-400 rounded-lg hover:bg-amber-600 hover:text-white transition-all" title="Add Var Mod"><Zap size={14} /></button>
                    <button onClick={() => addEvent(EventType.MUSIC_CHANGE)} className="p-2 bg-purple-600/10 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all" title="Change Audio"><Music size={14} /></button>
                  </div>
                </div>

                <div className="space-y-4 pb-20">
                  {data.events?.map((event, idx) => {
                    const char = characters.find(c => c.id === event.characterId);
                    const img = char?.images.find(i => i.id === event.characterImageId);

                    const isMissingAsset =
                      ((event.type === EventType.DIALOGUE || event.type === EventType.NARRATION || event.type === EventType.CHAR_ENTER || event.type === EventType.CHAR_EXIT) && event.characterId && !char) ||
                      ((event.type === EventType.DIALOGUE || event.type === EventType.NARRATION) && event.characterId && event.characterImageId && !img) ||
                      (event.type === EventType.MUSIC_CHANGE && event.audioAssetId && event.audioAssetId !== 'STOP' && !audioAssets.find(a => a.id === event.audioAssetId));

                    return (
                      <div key={event.id} className={`bg-slate-950/50 border rounded-2xl p-5 space-y-4 relative group transition-all ${isMissingAsset ? 'border-red-500 ring-2 ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-slate-800 hover:border-slate-700'
                        }`}>
                        <div className="absolute -left-2 top-6 w-5 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-black">{idx + 1}</div>
                        <div className="flex items-center gap-3">
                          {/* Character/Type Preview */}
                          <div className="flex items-center gap-2">
                            {(() => {
                              const previewImg = img || char?.images[0];
                              if (previewImg) {
                                return <img src={resolveImageUrl(previewImg.url)} className="w-6 h-6 rounded-md object-cover border border-slate-700" alt="char" />;
                              }

                              let typeLabel = "EVENT";
                              let colorClass = "bg-slate-800 text-slate-400 border-slate-700";

                              if (event.type === EventType.DIALOGUE) { typeLabel = "DIALOGUE"; colorClass = "bg-blue-900/20 text-blue-400 border-blue-500/30"; }
                              else if (event.type === EventType.NARRATION) { typeLabel = "NARRATION"; }
                              else if (event.type === EventType.CHAR_ENTER) { typeLabel = "ENTRY"; colorClass = "bg-emerald-900/20 text-emerald-400 border-emerald-500/30"; }
                              else if (event.type === EventType.CHAR_EXIT) { typeLabel = "EXIT"; colorClass = "bg-rose-900/20 text-rose-400 border-rose-500/30"; }
                              else if (event.type === EventType.MUSIC_CHANGE) { typeLabel = "AUDIO"; colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/30"; }
                              else if (event.type === EventType.ATTR_MOD) { typeLabel = "VAR"; colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/30"; }

                              return (
                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${colorClass}`}>
                                  {typeLabel}
                                </span>
                              );
                            })()}

                            <div className="flex flex-col">
                              {char && <span className="text-[10px] font-bold text-slate-300">{char.name}</span>}
                              {img && <span className="text-[8px] text-slate-500 font-medium uppercase tracking-tight">{img.name}</span>}

                              {/* Error messages with raw paths/IDs */}
                              {event.characterId && !char && (
                                <span className="text-[8px] text-red-500 font-bold">
                                  MISSING CHAR: {event.characterId}
                                </span>
                              )}
                              {event.characterId && event.characterImageId && !img && char && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-red-500 font-bold">MISSING POSE!</span>
                                  <span className="text-[7px] text-red-400/60 font-mono tracking-tighter">
                                    ID: {event.characterImageId}
                                  </span>
                                </div>
                              )}
                              {event.type === EventType.MUSIC_CHANGE && event.audioAssetId && event.audioAssetId !== 'STOP' && !audioAssets.find(a => a.id === event.audioAssetId) && (
                                <span className="text-[8px] text-red-500 font-bold">
                                  MISSING AUDIO: {event.audioAssetId}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1" />

                          <div className="flex items-center gap-2">
                            {event.voiceAssetId && <Mic size={14} className="text-emerald-500 animate-pulse" />}
                            <button onClick={() => removeEvent(event.id)} className="text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {(event.type === EventType.DIALOGUE || event.type === EventType.NARRATION || event.type === EventType.CHAR_ENTER || event.type === EventType.CHAR_EXIT) && (
                          <div className="space-y-4">
                            {(event.type === EventType.DIALOGUE || event.type === EventType.CHAR_ENTER || event.type === EventType.CHAR_EXIT) && (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={event.characterId}
                                  onChange={e => updateEvent(event.id, { characterId: e.target.value, characterImageId: undefined })}
                                  className="bg-slate-900 text-[10px] font-black text-blue-400 uppercase px-3 py-2 rounded-xl border border-slate-800 outline-none"
                                >
                                  <option value="">Select Character...</option>
                                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                {(event.type === EventType.DIALOGUE || event.type === EventType.CHAR_ENTER || event.type === EventType.CHAR_EXIT) && (
                                  <select
                                    value={event.characterImageId}
                                    onChange={e => updateEvent(event.id, { characterImageId: e.target.value })}
                                    className="bg-slate-900 text-[10px] font-black text-slate-500 uppercase px-3 py-2 rounded-xl border border-slate-800 outline-none"
                                  >
                                    <option value="">Pose...</option>
                                    {char?.images.map(img => <option key={img.id} value={img.id}>{img.name}</option>)}
                                  </select>
                                )}
                              </div>
                            )}

                            {(event.type === EventType.DIALOGUE || event.type === EventType.NARRATION) && (
                              <AutoResizeTextarea
                                value={event.text || ''}
                                onChange={e => updateEvent(event.id, { text: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 italic outline-none shadow-inner min-h-[100px]"
                                placeholder={event.type === EventType.NARRATION ? "Narration text..." : "Dialogue line..."}
                              />
                            )}
                          </div>
                        )}

                        {event.type === EventType.MUSIC_CHANGE && (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <select
                                value={event.audioAssetId}
                                onChange={e => updateEvent(event.id, { audioAssetId: e.target.value })}
                                className="flex-1 bg-slate-900 text-[10px] font-black text-purple-400 uppercase px-3 py-2 rounded-xl border border-slate-800 outline-none"
                              >
                                <option value="">Select Track...</option>
                                <option value="STOP">🛑 Stop Music</option>
                                {audioAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                              <button onClick={() => updateEvent(event.id, { loop: !event.loop })} className={`p-2 rounded-xl border border-slate-800 transition-colors ${event.loop ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-600'}`} title="Toggle Loop">
                                <Repeat size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {event.type === EventType.ATTR_MOD && (
                          <div className="grid grid-cols-2 gap-2">
                            <select className="bg-slate-900 text-[10px] font-black text-emerald-400 uppercase px-3 py-2 rounded-xl border border-slate-800 outline-none" value={event.attributeTargetId} onChange={e => updateEvent(event.id, { attributeTargetId: e.target.value })}>
                              {gameAttributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              {characters.flatMap(c => c.attributes || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.id.split('-')[0]})</option>)}
                            </select>
                            <input type="number" value={event.attributeValue} onChange={e => updateEvent(event.id, { attributeValue: parseInt(e.target.value) || 0 })} className="bg-slate-900 text-xs font-bold text-white px-3 py-2 rounded-xl border border-slate-800 outline-none" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedNode.type === 'LOGIC' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                  <label className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Branches</label>
                  <span className="text-[9px] text-slate-500 italic">Connect "New Path +" on node to add branch</span>
                </div>

                <div className="space-y-3">
                  {(!data.choices || data.choices.length === 0) && (
                    <div className="text-center py-8 text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-xl">
                      No active branches. Connect the node's '+' handle to a destination.
                    </div>
                  )}
                  {data.choices?.map((choice: any, idx: number) => (
                    <div key={choice.id} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                          PATH {idx + 1}
                        </span>
                        {(() => {
                          const targetNode = nodes.find(n => n.id === choice.nextNodeId);
                          return (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border ${targetNode
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                              {targetNode ? (
                                <>
                                  <span className="opacity-50">LEADS TO:</span>
                                  <span className="uppercase text-white">{targetNode.data.title || 'Untitled Scene'}</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={10} />
                                  <span>DISCONNECTED</span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) => {
                          const updated = data.choices.map((c: any) => c.id === choice.id ? { ...c, text: e.target.value } : c);
                          onUpdate(selectedNode.id, { choices: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 font-medium"
                        placeholder="Choice Label..."
                      />

                      {/* Conditions */}
                      <div className="flex flex-col gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800/50">
                        <span className="text-[9px] font-black text-slate-500">CONDITIONS ("IF...")</span>

                        {choice.logicRoot ? (
                          <div className="space-y-2">
                            <ConditionBuilder
                              condition={choice.logicRoot}
                              attributes={gameAttributes}
                              characters={characters}
                              onChange={(newRoot) => {
                                const updated = data.choices.map((c: any) => c.id === choice.id ? { ...c, logicRoot: newRoot } : c);
                                onUpdate(selectedNode.id, { choices: updated });
                              }}
                            />
                            <button
                              onClick={() => {
                                const updated = data.choices.map((c: any) => c.id === choice.id ? { ...c, logicRoot: undefined } : c);
                                onUpdate(selectedNode.id, { choices: updated });
                              }}
                              className="text-[9px] text-rose-500 hover:text-rose-400 underline self-end w-full text-right px-2"
                            >
                              Clear Conditions
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const defaultRoot: any = { id: `root-${Date.now()}`, type: 'STATEMENT', scope: 'GAME', comparison: '>', value: 0 };
                              const updated = data.choices.map((c: any) => c.id === choice.id ? { ...c, logicRoot: defaultRoot } : c);
                              onUpdate(selectedNode.id, { choices: updated });
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] py-1.5 px-3 rounded-lg border border-dashed border-slate-700 w-full"
                          >
                            + Add Condition Rule
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedNode.type === 'SETTER' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-slate-800 pt-6 mb-4">
                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Variable Operation</label>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-4">
                  {/* Target Attribute Selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Target Variable</label>
                    <select
                      value={data.events?.[0]?.attributeTargetId || ''}
                      onChange={(e) => {
                        const existingEvent = data.events?.[0];
                        const newEvent: SceneEvent = existingEvent
                          ? { ...existingEvent, attributeTargetId: e.target.value }
                          : {
                            id: Math.random().toString(36).substr(2, 9),
                            type: EventType.ATTR_MOD,
                            attributeTargetId: e.target.value,
                            operation: 'SET',
                            attributeValue: 0,
                            attributeFormula: undefined // Default to undefined so "Value" is used by default
                          };
                        onUpdate(selectedNode.id, { events: [newEvent] });
                      }}
                      className="w-full bg-slate-900 text-xs font-bold text-cyan-400 px-3 py-2 rounded-xl border border-slate-800 outline-none"
                    >
                      <option value="">Select Variable...</option>
                      <optgroup label="Global Attributes">
                        {gameAttributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </optgroup>
                      <optgroup label="Character Stats">
                        {characters.flatMap(c => c.attributes || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.id.split('-')[0]})</option>)}
                      </optgroup>
                    </select>
                  </div>

                  {/* Operation Selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Operation</label>
                    <div className="grid grid-cols-5 gap-1">
                      {['SET', 'ADD', 'SUB', 'MUL', 'DIV'].map(op => (
                        <button
                          key={op}
                          onClick={() => {
                            const ev = data.events?.[0];
                            if (ev) onUpdate(selectedNode.id, { events: [{ ...ev, operation: op as any }] });
                          }}
                          className={`py-2 rounded-lg text-[9px] font-black ${data.events?.[0]?.operation === op
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                            }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formula Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Values / Formula</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={data.events?.[0]?.attributeFormula || data.events?.[0]?.attributeValue || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const ev = data.events?.[0];
                          if (ev) onUpdate(selectedNode.id, {
                            events: [{
                              ...ev,
                              attributeFormula: val,
                              attributeValue: parseFloat(val) || 0
                            }]
                          });
                        }}
                        placeholder="e.g. 10, gold + 100, strength * 1.5"
                        className={`w-full bg-slate-900 border rounded-xl p-3 text-sm text-white font-mono focus:ring-1 outline-none ${(() => {
                          // Validation Logic
                          try {
                            const expr = data.events?.[0]?.attributeFormula;
                            if (!expr) return 'border-slate-800 focus:ring-cyan-500';
                            const mockKeys = [...gameAttributes.map(a => a.key), ...characters.flatMap(c => c.attributes || []).map(a => a.key)];
                            new Function(...mockKeys, `return ${expr}`);
                            return 'border-emerald-500/50 focus:ring-emerald-500';
                          } catch {
                            return 'border-rose-500/50 focus:ring-rose-500';
                          }
                        })()}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {(() => {
                          try {
                            const expr = data.events?.[0]?.attributeFormula;
                            if (!expr) return null;
                            const mockKeys = [...gameAttributes.map(a => a.key), ...characters.flatMap(c => c.attributes || []).map(a => a.key)];
                            new Function(...mockKeys, `return ${expr}`);
                            return <Check size={14} className="text-emerald-500" />;
                          } catch {
                            return <AlertTriangle size={14} className="text-rose-500" />;
                          }
                        })()}
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-600 italic">
                      Type a number or a formula. Variables: {gameAttributes.map(a => a.key).join(', ')}...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
