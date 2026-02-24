import React from 'react';
import { MENU_ITEMS } from '../constants';
import { NodeType } from '../types';
import { MessageSquare, Users, Terminal, Music, FolderOpen, Box, Folder, Play, Download, Zap, X, Plus, Info, LayoutTemplate, Sliders, Flag, Split, Loader2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

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
  activeSecondarySidebar: 'library' | 'publish' | null;
  onToggleSecondarySidebar: (type: 'library' | 'publish') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onExport,
  onBuild,
  isBuilding,
  projectName,
  onProjectNameChange,
  logs = [],
  onClearLogs,
  activeSecondarySidebar,
  onToggleSecondarySidebar
}) => {
  const [isConsoleCollapsed, setIsConsoleCollapsed] = React.useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none shadow-2xl z-[20] relative">
      {/* Header section with breathing room */}
      <div className="p-8 pb-6 border-b border-slate-800/50">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black bg-gradient-to-br from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              AdventureForge
            </h1>
            <button
              onClick={() => {
                const newName = prompt("Rename Project:", projectName);
                if (newName) onProjectNameChange?.(newName);
              }}
              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
            >
              <Edit3 size={15} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px] uppercase tracking-wider">{projectName || 'UNTITLED'}</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="text-[10px] font-medium text-slate-600">v1.0.4</span>
          </div>
        </div>
      </div>

      {/* Navigation with explicit indicators */}
      <nav className="p-4 pt-6 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
        <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3">Project Views</div>
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden ${isActive
                ? 'bg-blue-600/10 text-blue-400 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]'
                : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-500 shadow-lg shadow-blue-900/40 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                  {item.id === 'attributes' ? <Terminal size={18} /> : item.icon}
                </div>
              </div>
              <span className={`text-[13px] font-bold tracking-wide transition-all ${isActive ? 'translate-x-0' : 'group-hover:translate-x-0.5'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Toggles for Flyouts */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
        <div className="flex gap-2">
          <button
            onClick={() => onToggleSecondarySidebar('library')}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all border ${activeSecondarySidebar === 'library'
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-900/20'
              : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            <Box size={18} />
            <span className="text-[10px] font-black tracking-widest uppercase">Library</span>
          </button>

          <button
            onClick={() => onToggleSecondarySidebar('publish')}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all border ${activeSecondarySidebar === 'publish'
              ? 'bg-slate-800 text-white border-slate-700 shadow-xl'
              : 'text-slate-500 border-transparent hover:bg-slate-900/50 hover:text-slate-300'
              }`}
          >
            <Folder size={18} />
            <span className="text-[10px] font-black tracking-widest uppercase">Project</span>
          </button>
        </div>
      </div>

      {/* Build Console */}
      {(logs.length > 0 || isBuilding) && (
        <div className={`absolute bottom-28 left-6 right-6 bg-slate-950/95 backdrop-blur-xl border border-slate-800/50 flex flex-col z-[50] transition-all duration-500 shadow-2xl rounded-3xl overflow-hidden ${isConsoleCollapsed ? 'h-12' : 'max-h-[50%] h-auto'}`}>
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 cursor-pointer hover:bg-slate-900/50 transition-colors" onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 tracking-[0.1em]">
              <Terminal size={14} className={isBuilding ? "text-emerald-500" : "text-blue-500"} />
              <span>TERMINAL</span>
              {isBuilding && <Loader2 size={12} className="animate-spin text-emerald-500" />}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onClearLogs?.(); }}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors group"
                title="Clear logs"
              >
                <X size={14} className="text-slate-500 group-hover:text-rose-400" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1" />
              {isConsoleCollapsed ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </div>
          {!isConsoleCollapsed && (
            <div className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-1.5 bg-black/50 custom-scrollbar selection:bg-blue-500/20">
              {logs.map((log, i) => {
                const isErr = log.startsWith('ERR:');
                const isStatus = log.startsWith('STATUS:');
                return (
                  <div key={i} className={`whitespace-pre-wrap ${isErr ? 'text-rose-400' : isStatus ? 'text-emerald-400 font-bold' : 'text-slate-400 opacity-80'}`}>
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
