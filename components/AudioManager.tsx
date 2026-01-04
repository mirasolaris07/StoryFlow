
import React from 'react';
import { AudioAsset } from '../types';
import { Plus, Trash2, Music, Volume2, Search, Link as LinkIcon } from 'lucide-react';

interface AudioManagerProps {
  assets: AudioAsset[];
  onUpdate: (assets: AudioAsset[]) => void;
}

export const AudioManager: React.FC<AudioManagerProps> = ({ assets, onUpdate }) => {
  const addAsset = () => {
    const newAsset: AudioAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Sound Asset',
      url: ''
    };
    onUpdate([...assets, newAsset]);
  };

  const removeAsset = (id: string) => {
    onUpdate(assets.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, updates: Partial<AudioAsset>) => {
    onUpdate(assets.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Music className="text-purple-500" /> Audio Library
            </h2>
            <p className="text-sm text-slate-500 mt-1">Register background music tracks and sound effects for your story.</p>
          </div>
          <button 
            onClick={addAsset}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95"
          >
            <Plus size={18} /> Register Audio
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative group cursor-pointer" onClick={addAsset}>
              <div className="w-full min-w-[500px] aspect-[21/9] border-2 border-dashed border-purple-500/30 rounded-lg bg-purple-500/5 group-hover:border-purple-500/50 transition-all flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform opacity-30">
                  <Music size={32} />
                </div>
              </div>
              <p className="mt-3 text-purple-400 font-medium text-sm pl-1">No screen now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl flex items-center gap-6 group hover:border-slate-600 transition-colors">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-purple-400 border border-slate-800">
                  <Volume2 size={24} />
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Name</label>
                    <input 
                      type="text" value={asset.name} 
                      onChange={e => updateAsset(asset.id, { name: e.target.value })}
                      className="w-full bg-slate-900 border-none rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Stream URL / File Path</label>
                    <div className="flex items-center gap-2">
                       <input 
                        type="text" value={asset.url} 
                        placeholder="https://example.com/music.mp3"
                        onChange={e => updateAsset(asset.id, { url: e.target.value })}
                        className="flex-1 bg-slate-900 border-none rounded-lg p-2 text-xs text-slate-300 focus:ring-1 focus:ring-purple-500 font-mono outline-none"
                      />
                      <button className="p-2 bg-slate-900 text-slate-500 hover:text-white rounded-lg border border-slate-800">
                        <LinkIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => removeAsset(asset.id)}
                  className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
