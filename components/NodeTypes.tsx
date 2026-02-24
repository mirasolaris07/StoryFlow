
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeType, Character, AudioAsset, EventType } from '../types';
import { resolveImageUrl } from './GamePreview';
import { StagePreview } from './StagePreview';
import { Play, MessageSquare, Split, Flag, AlertTriangle, ChevronRight, ChevronDown, Plus, Sliders, LayoutTemplate, Mic } from 'lucide-react';

const BaseNode = ({ children, title, icon: Icon, colorClass, type, selected, isError, errors }: any) => (
  <div className={`min-w-[240px] min-h-[120px] bg-slate-900 border-2 transition-all duration-200 rounded-2xl shadow-2xl overflow-hidden group 
    ${isError ? 'border-red-500 animate-pulse shadow-red-900/40' : (selected ? 'ring-2 ring-blue-500/50 border-white' : 'border-slate-800')} 
    ${colorClass}`}>

    {/* Header */}
    <div className={`px-4 py-2.5 ${isError ? 'bg-red-500/10' : colorClass.replace('border-', 'bg-') + ' bg-opacity-10'} flex items-center justify-between border-b border-slate-800/50`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${isError ? 'bg-red-500/20' : colorClass.replace('border-', 'bg-') + ' bg-opacity-20'}`}>
          {isError ? <AlertTriangle size={14} className="text-red-500" /> : <Icon size={14} className="text-white" />}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${selected ? 'bg-blue-400' : (isError ? 'bg-red-500' : 'bg-slate-700')} group-hover:bg-white transition-colors`} />
    </div>

    {/* Content */}
    <div className="p-4 bg-slate-900/40 backdrop-blur-md">
      {isError && (
        <div className="mb-3 space-y-1">
          {(errors || ["Missing Asset Reference"]).map((err: string, i: number) => (
            <div key={i} className="text-[10px] bg-red-600/90 text-white px-2 py-1 rounded-md font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-900/20">
              <AlertTriangle size={10} className="fill-white" />
              {err}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>

    {/* Handles */}
    {type !== 'START' && <Handle type="target" position={Position.Left} className="!w-4 !h-4 !-left-2 !bg-slate-700 !border-2 !border-slate-400 hover:!bg-blue-500 transition-colors" />}
    {/* Disable default source handle for LOGIC nodes, as they have custom dynamic handles */}
    {type !== 'END' && type !== 'LOGIC' && type !== 'MENU' && <Handle type="source" position={Position.Right} className="!w-4 !h-4 !-right-2 !bg-slate-700 !border-2 !border-slate-400 hover:!bg-blue-500 transition-colors" />}
  </div>
);

// Helper to check for broken links
const checkNodeHealth = (data: any, characters: Character[] = [], audioAssets: AudioAsset[] = []) => {
  const events = data?.events || [];
  const errors: string[] = [];

  // Helper to strip query params for comparison
  const clean = (url?: string) => url?.split('?')[0] || '';

  // 1. Check Characters
  events.forEach((e: any) => {
    if (e.characterId) {
      const char = characters.find(c => c.id === e.characterId);
      if (!char) {
        const err = `Missing Character (${e.characterName || e.characterId})`;
        if (!errors.includes(err)) errors.push(err);
      } else if (e.characterImageId) {
        // 2. Check Poses
        const img = char.images.find(img => img.id === e.characterImageId);
        if (!img) {
          const err = `Missing Pose (${char.name})`;
          if (!errors.includes(err)) errors.push(err);
        }
      }
    }

    // 3. Check Audio
    if (e.audioAssetId && e.audioAssetId !== 'STOP') {
      const audio = audioAssets.find(a => a.id === e.audioAssetId);
      if (!audio) {
        const err = "Missing Audio";
        if (!errors.includes(err)) errors.push(err);
      }
    }
  });

  // 4. Check Background
  if (data.backgroundImage && !data.backgroundImage.startsWith('http') && !data.backgroundImage.startsWith('data:')) {
    // Basic connectivity check: if it's set but looks invalid/empty
    if (data.backgroundImage === 'invalid' || data.backgroundImage === '') {
      errors.push("Missing Background");
    }
  }

  return {
    isError: errors.length > 0,
    errors
  };
};

export const StartNode = memo(({ data, selected }: any) => (
  <BaseNode title="Start" icon={Play} colorClass="border-emerald-500" type="START" selected={selected}>
    <div className="text-[10px] text-slate-500 leading-relaxed italic">Entry point.</div>
  </BaseNode>
));

export const SceneNode = memo(({ data, selected }: any) => {
  // Extract global state from data which was injected in App.tsx
  const { characters = [], audioAssets = [] } = data;
  const { isError, errors } = checkNodeHealth(data, characters, audioAssets);
  const hasVoices = data.events?.some((e: any) => e.voiceAssetId);
  return (
    <BaseNode title={data.title || "New Scene"} icon={MessageSquare} colorClass="border-blue-500" type="SCENE" selected={selected} isError={isError} errors={errors}>
      {/* Scene Preview Stage */}
      <div className="mb-4 -mx-4 -mt-4 border-b border-slate-800 pointer-events-none relative overflow-hidden group/stage">
        <StagePreview
          data={data}
          characters={characters}
          onUpdateEvent={() => { }} // Non-interactive in node view
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
      </div>
      <div className="space-y-3 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>DIALOGUE</span>
              {hasVoices && <Mic size={10} className="text-blue-400 animate-pulse" />}
            </div>
            <span className="font-mono text-blue-400">{data.events?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>CHOICES</span>
            <span className="font-mono text-emerald-400">{data.choices?.length || 0}</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

export const LogicNode = memo(({ data, selected }: any) => {
  const { characters = [], audioAssets = [] } = data;
  const { isError, errors } = checkNodeHealth(data, characters, audioAssets);
  return (
    <BaseNode title="Logic" icon={Split} colorClass="border-amber-500" type="LOGIC" selected={selected} isError={isError} errors={errors}>
      <button
        onClick={(e) => { e.stopPropagation(); data.onToggleCollapse?.(); }}
        className="absolute top-2 right-8 text-amber-500 hover:text-white transition-colors"
      >
        {data.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      {/* Optional Background Preview */}
      {data.backgroundImage && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img src={resolveImageUrl(data.backgroundImage)} className="w-full h-full object-cover" alt="" />
        </div>
      )}
      <div
        className={`space-y-3 relative z-10 transition-all duration-300 origin-top overflow-hidden ${data.isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[500px] opacity-100'}`}
      >
        {data.description && <div className="text-[10px] text-slate-400 italic mb-2">{data.description}</div>}

        {(!data.choices || data.choices.length === 0) && (
          <div className="text-[10px] text-slate-500 italic p-2 border border-dashed border-slate-700 rounded mb-2">
            No choices active. Add one below.
          </div>
        )}

        {data.choices?.map((choice: any) => (
          <div key={choice.id} className="relative group/choice">
            <div className="bg-slate-950/50 border border-slate-700/50 p-2 rounded-lg text-[10px] flex items-center justify-between">
              <span className="font-bold text-amber-500 truncate max-w-[120px]" title={choice.text}>{choice.text}</span>
              {choice.condition && (
                <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-400" title={`if ${choice.condition.attributeId} ${choice.condition.op} ${choice.condition.val}`}>
                  IF
                </span>
              )}
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={choice.id}
              className="!w-3 !h-3 !-right-2.5 !bg-amber-600 !border-2 !border-slate-800 hover:!bg-amber-400 transition-colors top-1/2 -translate-y-1/2"
              style={{ top: '50%' }}
            />
          </div>
        ))}

        <div className="relative mt-2 p-2 border border-dashed border-slate-700/50 rounded-lg hover:border-amber-500/50 transition-colors group/new cursor-crosshair">
          <span className="text-[9px] font-bold text-slate-500 group-hover/new:text-amber-400 flex items-center gap-2 justify-center">
            <Plus size={10} /> NEW BRANCH
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="create-new"
            className="!w-4 !h-4 !-right-2.5 !bg-slate-800 !border-2 !border-slate-600 group-hover/new:!border-amber-500 group-hover/new:!bg-amber-500 transition-colors"
            style={{ top: '50%' }}
          />
        </div>
      </div>
    </BaseNode>
  );
});

export const SetterNode = memo(({ data, selected }: any) => {
  const { characters = [], audioAssets = [] } = data;
  const { isError, errors } = checkNodeHealth(data, characters, audioAssets);
  // Summary Calculation
  const event = data.events?.[0];
  const summary = event
    ? `${event.attributeTargetId || '???'} ${event.operation || 'SET'} ${event.attributeFormula || event.attributeValue || 0}`
    : "No Operation";

  return (
    <BaseNode title="Setter" icon={Sliders} colorClass="border-cyan-500" type="SETTER" selected={selected} isError={isError} errors={errors}>
      <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/30 p-2 rounded border border-cyan-500/30">
        {summary}
      </div>
    </BaseNode>
  );
});

export const MenuNode = memo(({ data, selected }: any) => {
  const { characters = [], audioAssets = [] } = data;
  const { isError, errors } = checkNodeHealth(data, characters, audioAssets);
  return (
    <BaseNode title="Main Menu" icon={LayoutTemplate} colorClass="border-indigo-500" type="MENU" selected={selected} isError={isError} errors={errors}>
      {/* Optional Background Preview */}
      {data.backgroundImage && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img src={resolveImageUrl(data.backgroundImage)} className="w-full h-full object-cover" alt="" />
        </div>
      )}
      <div className="relative z-10 space-y-2">
        <div className="text-center py-2">
          <div className="text-xs font-black text-white uppercase tracking-widest">{data.title || "Game Title"}</div>
          <div className="text-[9px] text-slate-400 italic">{data.subtitle}</div>
        </div>

        <div className="space-y-1">
          {['Start Game', 'Load Game', 'Settings', 'Exit'].map((btn) => (
            <div key={btn} className="bg-slate-950/80 border border-slate-700/50 p-1.5 rounded text-[9px] text-center text-slate-300 font-bold uppercase tracking-wider relative group/btn">
              {btn}
              {btn === 'Start Game' && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id="start"
                  className="!w-3 !h-3 !-right-3 !bg-indigo-500 !border-2 !border-slate-800 hover:!bg-indigo-400 transition-colors top-1/2 -translate-y-1/2"
                  style={{ top: '50%' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
});

export const EndNode = memo(({ data, selected }: any) => {
  const { characters = [], audioAssets = [] } = data;
  const { isError, errors } = checkNodeHealth(data, characters, audioAssets);
  return (
    <BaseNode title="End" icon={Flag} colorClass="border-rose-500" type="END" selected={selected} isError={isError} errors={errors}>
      <div className="text-[10px] text-slate-300">Conclusion</div>
    </BaseNode>
  );
});
