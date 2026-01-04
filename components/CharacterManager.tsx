
import React, { useState, useRef } from 'react';
import { Character, CharacterImage, Attribute } from '../types';
import { uploadAsset } from '../services/api';
import { Plus, Trash2, Image as ImageIcon, User, Shield, FileCode, Upload, Loader2 } from 'lucide-react';

interface CharacterManagerProps {
  characters: Character[];
  onUpdate: (chars: Character[]) => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ characters, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(characters[0]?.id || null);
  const selectedChar = characters.find(c => c.id === selectedId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const addCharacter = () => {
    const name = prompt("Character Name?");
    if (!name) return;
    const charId = name.toLowerCase().replace(/\s/g, '_');

    const attributeTemplate = characters[0]?.attributes || [];
    const newChar: Character = {
      id: charId,
      name: name,
      voiceId: 'None',
      images: [],
      attributes: attributeTemplate.map(a => ({
        ...a,
        id: `${charId}-${a.key}`,
        initialValue: 0
      }))
    };
    onUpdate([...characters, newChar]);
    setSelectedId(newChar.id);
  };

  const updateChar = (updates: Partial<Character>) => {
    if (!selectedId) return;
    onUpdate(characters.map(c => c.id === selectedId ? { ...c, ...updates } : c));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChar) return;

    setIsUploading(true);
    try {
      // Upload to Character/[ID] folder
      const path = `Character/${selectedChar.name}`;
      const url = await uploadAsset(file, path);

      const newImage: CharacterImage = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.split('.')[0],
        url: url
      };
      updateChar({ images: [...selectedChar.images, newImage] });
    } catch (err) {
      alert("Upload failed. Ensure server.py is running!");
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      <div className="w-72 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Project Cast</h2>
          <button onClick={addCharacter} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {characters.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full p-4 flex items-center gap-4 rounded-2xl transition-all ${selectedId === c.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border ${selectedId === c.id ? 'border-white/20 bg-white/10' : 'border-slate-800 bg-slate-950'}`}>
                <img
                  src={c.images[0]?.url}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/micah/svg?seed=${c.id}`; }}
                />
              </div>
              <div className="text-left">
                <div className="text-sm font-black tracking-tight">{c.name}</div>
                <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedId === c.id ? 'text-blue-100' : 'text-slate-600'}`}>{c.voiceId}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-950 p-12">
        {selectedChar ? (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1 mr-10">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Name</label>
                  <input
                    type="text" value={selectedChar.name}
                    onChange={e => updateChar({ name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-3xl font-black text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Description / Bio</label>
                  <textarea
                    value={selectedChar.description || ''}
                    onChange={e => updateChar({ description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px] resize-none"
                    placeholder="Character background, personality, or notes..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Voice Actor (Google Cloud)</label>
                  <select
                    value={selectedChar.voiceId || 'Puck'}
                    onChange={e => updateChar({ voiceId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  >
                    {['None', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => { if (confirm(`Delete ${selectedChar.name}?`)) { onUpdate(characters.filter(c => c.id !== selectedId)); setSelectedId(null); } }}
                className="mt-6 p-5 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
              >
                <Trash2 size={24} />
              </button>
            </div>

            {/* SYNCED ATTRIBUTES SECTION */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-4">
                  <Shield className="text-amber-500" /> Character Stats
                </h3>
                <button
                  onClick={() => {
                    // Add Attribute to ALL characters
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newAttr: Attribute = {
                      id: newId,
                      key: 'new_stat',
                      name: 'New Stat',
                      initialValue: 0,
                      visible: true,
                      type: 'CHARACTER'
                    };

                    const updatedChars = characters.map(c => ({
                      ...c,
                      attributes: [...c.attributes, { ...newAttr }]
                    }));
                    onUpdate(updatedChars);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <Plus size={14} /> Add Stat
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 space-y-4">
                {(selectedChar.attributes || []).length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-xs italic">
                    No stats defined. Add one to track health, trust, or skills.
                  </div>
                )}
                {selectedChar.attributes?.map((attr, idx) => (
                  <div key={attr.id} className="grid grid-cols-12 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800/50 group">
                    {/* Name (Synced) */}
                    <div className="col-span-4 space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase">Stat Name (Shared)</label>
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          const newKey = newVal.toLowerCase().replace(/\s+/g, '_');
                          // Sync rename across ALL characters
                          const updatedMap = characters.map(c => ({
                            ...c,
                            attributes: c.attributes.map(a => a.id === attr.id ? { ...a, name: newVal, key: newKey } : a)
                          }));
                          onUpdate(updatedMap);
                        }}
                        className="w-full bg-transparent border-b border-slate-700 text-amber-500 font-bold text-sm focus:border-amber-500 outline-none pb-1"
                      />
                    </div>

                    {/* Value (Local) */}
                    <div className="col-span-3 space-y-1 border-l border-slate-800 pl-4">
                      <label className="text-[9px] font-bold text-slate-600 uppercase">Value ({selectedChar.name})</label>
                      <input
                        type="number"
                        value={Number.isNaN(attr.initialValue) ? '' : attr.initialValue}
                        onChange={(e) => {
                          const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                          // Update ONLY this character
                          const updatedMap = characters.map(c =>
                            c.id === selectedId
                              ? { ...c, attributes: c.attributes.map(a => a.id === attr.id ? { ...a, initialValue: val } : a) }
                              : c
                          );
                          onUpdate(updatedMap);
                        }}
                        className="w-full bg-slate-900 rounded-lg px-3 py-1 text-white font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Key Display */}
                    <div className="col-span-4 pl-4 flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Reference Key</span>
                      <code className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded w-fit">
                        character.{attr.key}
                      </code>
                    </div>

                    {/* Delete (Synced) */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => {
                          if (confirm(`Delete stat '${attr.name}' from ALL characters?`)) {
                            const updatedMap = characters.map(c => ({
                              ...c,
                              attributes: c.attributes.filter(a => a.id !== attr.id)
                            }));
                            onUpdate(updatedMap);
                          }
                        }}
                        className="p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-4">Pose Library</h3>
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50">
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Pose
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6">
                {selectedChar.images.map(img => (
                  <div key={img.id} className="relative group aspect-[4/5] rounded-[32px] bg-slate-900 overflow-hidden border border-slate-800 p-2 flex flex-col">
                    <div className="flex-1 rounded-[24px] overflow-hidden bg-black mb-2 relative">
                      <img
                        src={img.url}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/micah/svg?seed=${img.id}`; }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => updateChar({ images: selectedChar.images.filter(i => i.id !== img.id) })} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Delete</button>
                      </div>
                    </div>
                    <div className="px-2 pb-1 truncate text-[10px] font-black text-white uppercase tracking-widest">{img.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-700">
            <User size={64} className="mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select character to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};
