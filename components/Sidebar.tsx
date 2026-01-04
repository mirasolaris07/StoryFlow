
import React from 'react';
import { MENU_ITEMS } from '../constants';
import { NodeType } from '../types';
import { Play, MessageSquare, Split, Flag, Box, Lock, Sliders, LayoutTemplate, Loader2, Edit3, Terminal as TerminalIcon, X, ChevronDown, ChevronUp } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  onExport?: (format: 'json' | 'yaml' | 'storyline' | 'storyline_yaml' | 'storyline_md') => void;
  onBuild?: () => Promise<void>;
  isBuilding?: boolean;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  logs?: string[];
  onClearLogs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onExport, onBuild, isBuilding, projectName, onProjectNameChange, logs = [], onClearLogs }) => {
  const [isConsoleCollapsed, setIsConsoleCollapsed] = React.useState(false);
  console.log("Sidebar: isBuilding =", isBuilding);
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      <div className="p-6 border-b border-slate-800 space-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              AdventureForge
            </h1>
            <button
              onClick={() => {
                const newName = prompt("Rename Project:", projectName);
                if (newName) onProjectNameChange?.(newName);
              }}
              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
              title="Rename Project"
            >
              <Edit3 size={14} />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-2">
            <span className="truncate max-w-[140px]" title={projectName}>{projectName || 'Untitled Project'}</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="text-slate-600">v1.0</span>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === item.id
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mb-4 flex items-center gap-2">
            <Box size={12} />
            Node Library
          </h3>
          <div className="space-y-3">
            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-emerald-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.START)}
              draggable
            >
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                <Play size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Start Node</div>
                <div className="text-[10px] text-slate-500 uppercase">Entry Point</div>
              </div>
            </div>

            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.SCENE)}
              draggable
            >
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                <MessageSquare size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Scene Node</div>
                <div className="text-[10px] text-slate-500 uppercase">Narrative</div>
              </div>
            </div>

            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-amber-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.LOGIC)}
              draggable
            >
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 group-hover:scale-110 transition-transform">
                <Split size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Logic Node</div>
                <div className="text-[10px] text-slate-500 uppercase">Branching</div>
              </div>
            </div>

            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-cyan-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.SETTER)}
              draggable
            >
              <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-500 group-hover:scale-110 transition-transform">
                <Sliders size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Setter Node</div>
                <div className="text-[10px] text-slate-500 uppercase">Variables</div>
              </div>
            </div>

            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.MENU)}
              draggable
            >
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-500 group-hover:scale-110 transition-transform">
                <LayoutTemplate size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Main Menu</div>
                <div className="text-[10px] text-slate-500 uppercase">Start Screen</div>
              </div>
            </div>

            <div
              className="group flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-rose-500/50 hover:bg-slate-800 transition-all"
              onDragStart={(event) => onDragStart(event, NodeType.END)}
              draggable
            >
              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500 group-hover:scale-110 transition-transform">
                <Flag size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">End Node</div>
                <div className="text-[10px] text-slate-500 uppercase">Conclusion</div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-slate-600 italic px-2">
            Drag nodes onto the canvas to build your story.
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Export Data</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onExport && onExport('json')} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl border border-slate-700 transition-colors text-[10px] font-bold">
            JSON
          </button>
          <button onClick={() => onExport && onExport('yaml')} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl border border-slate-700 transition-colors text-[10px] font-bold">
            YAML
          </button>
        </div>
        <button onClick={() => onExport && onExport('storyline_yaml')} className="w-full flex items-center justify-center gap-2 bg-indigo-900/20 hover:bg-indigo-600 hover:text-white text-indigo-400 py-2.5 rounded-xl border border-indigo-500/20 transition-colors text-xs font-bold">
          Export Script
        </button>
        <button onClick={() => onExport && onExport('storyline_md')} className="w-full flex items-center justify-center gap-2 bg-pink-900/20 hover:bg-pink-600 hover:text-white text-pink-400 py-2.5 rounded-xl border border-pink-500/20 transition-colors text-xs font-bold mt-2">
          <Lock size={12} className="opacity-50" /> Export Visual Script (.md)
        </button>
      </div>

      <div className="p-4 pt-0 border-t border-transparent space-y-2">
        <div className="flex justify-between items-center pl-1 mb-1">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Build Application</div>
          {isBuilding && <span className="text-[8px] text-emerald-500 font-bold animate-pulse">BUILDING_ACTIVE</span>}
        </div>
        <button
          onClick={async () => {
            if (isBuilding) return;
            if (onBuild) {
              await onBuild();
            } else {
              alert("Build system not linked.");
            }
          }}
          disabled={isBuilding}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-xs font-bold ${isBuilding
            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            : 'bg-emerald-900/20 hover:bg-emerald-600 hover:text-white text-emerald-400 border-emerald-500/20'
            }`}
        >
          {isBuilding ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Building Story...</span>
            </>
          ) : (
            <span>Export Story (.exe)</span>
          )}
        </button>
        <button
          onClick={() => alert("Mobile Export (iOS/Android):\nRequires Capacitor/Cordova setup.\n\nGuide: npx cap add android\n(See Publishing Guide)")}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 py-2.5 rounded-xl border border-slate-700 transition-colors text-xs font-bold"
        >
          <Lock size={12} className="opacity-50" /> iOS / Android
        </button>
      </div>

      {/* Build Console */}
      {(logs.length > 0 || isBuilding) && (
        <div className={`absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 flex flex-col z-[50] transition-all duration-300 shadow-2xl ${isConsoleCollapsed ? 'h-10' : 'max-h-[40%] h-auto'}`}>
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 cursor-pointer" onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <TerminalIcon size={12} />
              <span>BUILD CONSOLE</span>
              {isBuilding && <Loader2 size={10} className="animate-spin text-emerald-500" />}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearLogs?.();
                }}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
                title="Clear Logs"
              >
                <X size={12} className="text-slate-500" />
              </button>
              <button
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                {isConsoleCollapsed ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
            </div>
          </div>
          {!isConsoleCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1 selection:bg-blue-500/30 select-text bg-black/40">
              {logs.map((log, i) => {
                const isErr = log.startsWith('ERR:');
                const isStatus = log.startsWith('STATUS:');
                return (
                  <div key={i} className={`whitespace-pre-wrap select-text cursor-text ${isErr ? 'text-rose-400' : isStatus ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    {log}
                  </div>
                );
              })}
              <div id="logs-end" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
