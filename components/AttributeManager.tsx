
import React from 'react';
import { Attribute } from '../types';
import { Plus, Trash2, Terminal, Eye, EyeOff, Hash } from 'lucide-react';

interface AttributeManagerProps {
  attributes: Attribute[];
  onUpdate: (attrs: Attribute[]) => void;
}

export const AttributeManager: React.FC<AttributeManagerProps> = ({ attributes, onUpdate }) => {
  const addAttribute = () => {
    const newAttr: Attribute = {
      id: Math.random().toString(36).substr(2, 9),
      key: 'new_variable',
      name: 'New Global Variable',
      initialValue: 0,
      visible: true,
      type: 'GAME'
    };
    onUpdate([...attributes, newAttr]);
  };

  const removeAttribute = (id: string) => {
    onUpdate(attributes.filter(a => a.id !== id));
  };

  const updateAttribute = (id: string, updates: Partial<Attribute>) => {
    onUpdate(attributes.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Terminal className="text-blue-500" /> Global Game Attributes
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage global variables like gold, health, or player reputation.</p>
          </div>
          <button
            onClick={addAttribute}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95"
          >
            <Plus size={18} /> Add Attribute
          </button>
        </div>

        {attributes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative group cursor-pointer" onClick={addAttribute}>
              <div className="w-full min-w-[500px] aspect-[21/9] border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 group-hover:border-blue-500/50 transition-all flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform opacity-30">
                  <Hash size={32} />
                </div>
              </div>
              <p className="mt-3 text-blue-400 font-medium text-sm pl-1">No screen now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {attributes.map(attr => (
              <div key={attr.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl flex items-center gap-6 group hover:border-slate-600 transition-colors">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Variable Name</label>
                    <input
                      type="text" value={attr.name}
                      onChange={e => updateAttribute(attr.id, { name: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="w-full bg-slate-900 border-none rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Internal ID</label>
                    <div className="w-full bg-slate-900/50 rounded-lg p-2 text-xs text-slate-500 font-mono overflow-hidden whitespace-nowrap">
                      {attr.key}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Initial Value</label>
                    <input
                      type="number"
                      value={Number.isNaN(attr.initialValue) ? '' : attr.initialValue}
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                        updateAttribute(attr.id, { initialValue: val });
                      }}
                      onBlur={() => {
                        if (Number.isNaN(attr.initialValue)) {
                          updateAttribute(attr.id, { initialValue: 0 });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="w-full bg-slate-900 border-none rounded-lg p-2 text-sm text-blue-400 focus:ring-1 focus:ring-blue-500 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pr-2 border-l border-slate-700 pl-4">
                  <button
                    onClick={() => updateAttribute(attr.id, { visible: !attr.visible })}
                    className={`p-2 rounded-lg transition-colors ${attr.visible ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'}`}
                    title={attr.visible ? 'Visible in UI' : 'Hidden internal variable'}
                  >
                    {attr.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => removeAttribute(attr.id)}
                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
