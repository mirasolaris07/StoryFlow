
import React, { useState, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { GameState, NodeData, EventType, Character, AudioAsset, DialogueBoxStyle, Attribute } from '../types';
import { synthesizeVoice } from '../services/geminiService';
import { useTypewriter } from '../hooks/useTypewriter';
import { usePaginatedText } from '../hooks/usePaginatedText';
import { themes } from '../data/characterThemes';
import { ChevronRight, X, Volume2, Music, Loader2, MessageSquare, Sliders, Activity, Save } from 'lucide-react';
import { SaveLoadModal } from './SaveLoadModal';

interface GamePreviewProps {
  nodes: Node[];
  edges: Edge[];
  characters: Character[];
  audioAssets: AudioAsset[];
  gameAttributes: Attribute[];
  dialogueStyle?: DialogueBoxStyle;
  initialNodeId?: string | null;
  narratorVoice?: string;
  onClose: () => void;
}

// Utility to handle image paths with smart fallbacks
export const resolveImageUrl = (path: string | undefined) => {
  if (!path || path.trim() === '') return undefined;

  // If it's a URL or Data URI, return as is. 
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }

  // If SERVICE_ROOT is defined, prepend it
  const serviceRoot = process.env.SERVICE_ROOT;
  if (serviceRoot) {
    // Remove leading slash from path if it exists to avoid double slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // Ensure serviceRoot ends with slash
    const cleanRoot = serviceRoot.endsWith('/') ? serviceRoot : `${serviceRoot}/`;
    return `${cleanRoot}${cleanPath}`;
  }

  return path;
};

const getPlaceholder = (type: 'bg' | 'char', seed: string = 'default') => {
  if (type === 'bg') {
    return `https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=2000&sig=${encodeURIComponent(seed)}`;
  }
  return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  try {
    const arrayBuffer = (data.buffer as any).slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn("Standard decode failed, falling back to raw PCM interpretation", e);
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
    const frameCount = Math.floor(dataInt16.length / numChannels);
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}

const AttributeMonitor = ({ gameState, gameAttributes, characters, onClose }: any) => {
  return (
    <div className="absolute top-20 left-8 z-[70] w-64 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl space-y-4 animate-in slide-in-from-left-2 fade-in duration-300">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
          <Activity size={12} /> Variable Monitor
        </h4>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={12} /></button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {/* Game Attributes */}
        <div className="space-y-2">
          <h5 className="text-[9px] font-bold text-slate-500 uppercase">Global</h5>
          {gameAttributes.map((attr: Attribute) => (
            <div key={attr.id} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-mono">{attr.name}</span>
              <span className="font-bold text-cyan-300">{gameState.gameAttributes[attr.id] ?? attr.initialValue}</span>
            </div>
          ))}
        </div>

        {/* Character Attributes */}
        {characters.map((char: Character) => (
          (char.attributes && char.attributes.length > 0) && (
            <div key={char.id} className="space-y-2">
              <h5 className="text-[9px] font-bold text-slate-500 uppercase">{char.name}</h5>
              {char.attributes.map((attr: Attribute) => (
                <div key={attr.id} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-mono">{attr.name}</span>
                  <span className="font-bold text-amber-300">
                    {gameState.characterAttributes[char.id]?.[attr.id] ?? attr.initialValue}
                  </span>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export const GamePreview: React.FC<GamePreviewProps> = ({
  nodes, edges, characters, audioAssets, gameAttributes: initialGameAttrs, dialogueStyle, initialNodeId, narratorVoice = 'Fenrir', onClose
}) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // ... (keep existing init logic, but we can't use addLog here effectively yet unless we refactor) ...
    // ... just keep it as is ...
    if (initialNodeId) {
      return {
        gameAttributes: {},
        characterAttributes: {},
        characters: characters,
        currentSceneId: initialNodeId,
        activeMusicId: null,
        history: []
      };
    }
    const startNodeId = nodes.find(n => n.type === 'START')?.id || '';
    const firstEdge = edges.find(e => e.source === startNodeId);
    return {
      gameAttributes: {},
      characterAttributes: {},
      characters: characters,
      currentSceneId: firstEdge ? firstEdge.target : startNodeId,
      activeMusicId: null,
      history: []
    };
  });

  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [dialoguePos, setDialoguePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveLoadMode, setSaveLoadMode] = useState<'SAVE' | 'LOAD' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString().split(' ')[0]} ${msg}`]);
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Helper to find node by ID
  const getNode = (id: string) => nodes.find(n => n.id === id);

  const currentNode = getNode(gameState.currentSceneId);
  const nodeData = currentNode?.data as NodeData;
  const isLogicNode = currentNode?.type === 'LOGIC';
  const currentEvent = nodeData?.events?.[currentEventIndex];

  const getCharacter = (id?: string) => characters.find(c => c.id === id);
  const currentChar = getCharacter(currentEvent?.characterId);
  const currentImg = currentChar?.images.find(img => img.id === currentEvent?.characterImageId) || currentChar?.images[0];

  // Lookahead Logic: Recursively process SETTER nodes
  const processForwards = (startNodeId: string, currentState: GameState): { targetId: string | null; newState: GameState } => {
    let currentId = startNodeId;
    let state = { ...currentState };
    let safetyCounter = 0;

    addLog(`Lookahead: Starting at ${startNodeId}`);

    while (currentId && safetyCounter < 100) {
      const node = getNode(currentId);
      if (!node) {
        addLog(`Lookahead: Node ${currentId} not found!`);
        break;
      }

      if (node.type === 'SETTER') {
        const event = node.data.events?.[0];
        addLog(`Lookahead: Processing Setter ${currentId}`);

        // --- Execute Setter Logic on `state` ---
        if (event) {
          const targetId = event.attributeTargetId;
          const op = event.operation || 'SET';
          const isGlobal = initialGameAttrs.some(a => a.id === targetId);

          let currentVal = 0;
          let charId = '';

          if (isGlobal) {
            const attr = initialGameAttrs.find(a => a.id === targetId);
            currentVal = state.gameAttributes[targetId!] ?? attr?.initialValue ?? 0;
          } else {
            const char = characters.find(c => c.attributes.some(a => a.id === targetId));
            if (char) {
              charId = char.id;
              const attr = char.attributes.find(a => a.id === targetId);
              currentVal = state.characterAttributes[charId]?.[targetId!] ?? attr?.initialValue ?? 0;
            }
          }

          let inputVal = 0;
          if (event.attributeFormula) {
            const context: any = {};
            (initialGameAttrs || []).forEach(a => context[a.key] = state.gameAttributes[a.id] ?? a.initialValue);
            (characters || []).forEach(c => {
              (c.attributes || []).forEach(a => {
                context[a.key] = (state.characterAttributes[c.id]?.[a.id] ?? a.initialValue);
              });
            });
            try {
              const keys = Object.keys(context);
              const values = Object.values(context);
              const formulaFunc = new Function(...keys, `return ${event.attributeFormula};`);
              inputVal = Number(formulaFunc(...values));
            } catch (e) {
              addLog(`Formula Error: ${e}`);
              inputVal = event.attributeValue || 0;
            }
          } else {
            inputVal = event.attributeValue || 0;
          }

          if (Number.isNaN(inputVal)) inputVal = 0;

          const oldVal = currentVal;
          let finalVal = currentVal;
          if (op === 'SET') finalVal = inputVal;
          if (op === 'ADD') finalVal += inputVal;
          if (op === 'SUB') finalVal -= inputVal;
          if (op === 'MUL') finalVal *= inputVal;
          if (op === 'DIV') finalVal /= inputVal;

          addLog(`Setter: ${op} ${inputVal} on ${currentVal} (Target: ${targetId}) -> ${finalVal}`);

          if (isGlobal && targetId) {
            state.gameAttributes = { ...state.gameAttributes, [targetId]: finalVal };
          } else if (charId && targetId) {
            state.characterAttributes = {
              ...state.characterAttributes,
              [charId]: {
                ...(state.characterAttributes[charId] || {}),
                [targetId]: finalVal
              }
            };
          }
        }
        // --- End Logic ---

        // Move to next node immediately
        const outgoing = edges.filter(e => e.source === currentId);
        if (outgoing.length > 0) {
          currentId = outgoing[0].target;
          addLog(`Lookahead: Moving to ${currentId}`);
        } else {
          // Dead end setter
          addLog(`Lookahead: Dead end at ${currentId}`);
          return { targetId: null, newState: state };
        }
      } else {
        // Not a setter (Scene, Logic, etc) - Stop here, this is our render target
        addLog(`Lookahead: Resolved to ${currentId} (${node.type})`);
        return { targetId: currentId, newState: state };
      }
      safetyCounter++;
    }
    return { targetId: null, newState: state };
  };

  const nextNode = (targetId?: string) => {
    let nextId = targetId;
    addLog(`nextNode called. Target: ${targetId || 'auto'}. Curr: ${gameState.currentSceneId}`);

    if (!nextId) {
      const outgoingEdges = edges.filter(e => e.source === gameState.currentSceneId);
      if (outgoingEdges.length > 0) {
        nextId = outgoingEdges[0].target;
        addLog(`Found outgoing edge to: ${nextId}`);
      } else {
        addLog(`No outgoing edges from ${gameState.currentSceneId}`);
        const currentNode = getNode(gameState.currentSceneId);
        if (currentNode?.type !== 'END') {
          setError(`Ended at ${gameState.currentSceneId || 'Start'}: No outgoing connection found.`);
        }
        return;
      }
    }

    if (nextId) {
      setGameState(prev => {
        const { targetId: finalId, newState } = processForwards(nextId!, prev);
        if (finalId) {
          addLog(`Transitioning to ${finalId}`);
          newState.currentSceneId = finalId;
          return newState;
        } else {
          addLog(`Failed to resolve valid target from ${nextId}`);
          setError(`Flow Error: Setter Chain Dead End. Started at ${nextId}.`);
          return prev;
        }
      });
      setCurrentEventIndex(0);
    }
  };

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    bgmRef.current = new Audio();
    bgmRef.current.volume = 0.4;
    return () => {
      audioContextRef.current?.close();
      if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current.src = ''; }
      stopVoice();
    };
  }, []);

  const stopVoice = () => {
    if (currentVoiceSource.current) {
      try { currentVoiceSource.current.stop(); } catch (e) { }
      currentVoiceSource.current = null;
    }
  };

  // Handle MENU Node Music
  useEffect(() => {
    if (currentNode?.type === 'MENU' && nodeData?.backgroundMusic) {
      const asset = audioAssets.find(a => a.id === nodeData.backgroundMusic);
      if (asset && asset.url && gameState.activeMusicId !== asset.id) {
        if (bgmRef.current) {
          bgmRef.current.src = asset.url;
          bgmRef.current.loop = true;
          bgmRef.current.play().catch(() => { });
          setGameState(prev => ({ ...prev, activeMusicId: asset.id }));
        }
      }
    }
  }, [gameState.currentSceneId, nodeData?.backgroundMusic]);

  useEffect(() => {
    if (!currentEvent) return;
    if (currentEvent.type === EventType.MUSIC_CHANGE && currentEvent.audioAssetId) {
      if (currentEvent.audioAssetId === 'STOP') {
        // Stop Audio Command
        if (bgmRef.current) {
          bgmRef.current.pause();
          bgmRef.current.src = '';
          setGameState(prev => ({ ...prev, activeMusicId: null }));
        }
      } else {
        // Play Audio Command
        const asset = audioAssets.find(a => a.id === currentEvent.audioAssetId);
        if (asset && asset.url) {
          if (gameState.activeMusicId !== asset.id) {
            bgmRef.current!.src = asset.url;
            bgmRef.current!.loop = !!currentEvent.loop;
            bgmRef.current!.play().catch(() => { });
            setGameState(prev => ({ ...prev, activeMusicId: asset.id }));
          }
        }
      }
      if (!currentEvent.text) setTimeout(() => nextEvent(), 100);
    }
  }, [currentEventIndex, gameState.currentSceneId]);

  // SAFETY: If we somehow land on a SETTER node (e.g. initial start, or lookahead fail), force move forward
  // Only if NO error is present
  useEffect(() => {
    if (currentNode?.type === 'SETTER' && !error) {
      console.log("[Preview] Landed on SETTER node. Processing from current node...");
      const timer = setTimeout(() => {
        setGameState(prev => {
          // Process starting from CURRENT node to ensure its logic runs
          const { targetId: finalId, newState } = processForwards(currentNode.id, prev);
          if (finalId) {
            addLog(`Setting State from Setter: ${finalId}`);
            newState.currentSceneId = finalId;
            return newState;
          } else {
            setError(`Flow Error: Setter Chain Dead End. Started at ${currentNode.id}.`);
            return prev;
          }
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentNode?.id, error]);

  // Pagination Logic
  const dialogueRef = useRef<HTMLDivElement>(null);
  const [boxDims, setBoxDims] = useState({ w: 1000, h: 200 }); // Defaults

  // Measure box dimensions when style or event changes
  useEffect(() => {
    if (dialogueRef.current) {
      setBoxDims({
        w: dialogueRef.current.clientWidth - 80,
        h: dialogueRef.current.clientHeight - 80
      });
    }
  }, [dialogueStyle, currentEvent, dialogueRef.current]);

  const { pages, measureRef } = usePaginatedText(
    currentEvent?.text || '',
    boxDims.h,
    boxDims.w,
    {
      fontSize: '24px',
      fontFamily: currentChar && themes[currentChar.name.toLowerCase()] ? themes[currentChar.name.toLowerCase()].font : (dialogueStyle?.fontFamily || 'inherit'),
      lineHeight: '1.625', // Relaxed
      padding: '0px'
    }
  );

  const [pageIndex, setPageIndex] = useState(0);

  // Reset page when event changes
  useEffect(() => {
    setPageIndex(0);
  }, [currentEvent]);

  // Use typewriter on CURRENT PAGE content
  const { displayedText, isTyping, skip } = useTypewriter(pages[pageIndex] || '', 30);

  const handleNextClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDragging) return;

    if (isTyping) {
      skip();
      stopVoice();
    } else {
      stopVoice();
      // Check if there are more pages
      if (pageIndex < pages.length - 1) {
        setPageIndex(prev => prev + 1);
      } else {
        // No more pages, go to next event
        if (!nodeData?.events || nodeData.events.length === 0) { nextNode(); return; }
        if (currentEventIndex < nodeData.events.length - 1) {
          setCurrentEventIndex(prev => prev + 1);
        } else {
          nextNode();
        }
      }
    }
  };

  // Override nextEvent to use handleNextClick for consistency
  const nextEvent = (e?: React.MouseEvent) => {
    handleNextClick(e);
  };

  const currentVoiceSource = useRef<AudioBufferSourceNode | null>(null);

  const playVoice = async (text: string, voiceId: string, assetUrl?: string) => {
    stopVoice();

    try {
      setIsSynthesizing(true);

      let audioData: Uint8Array;
      if (assetUrl) {
        const response = await fetch(assetUrl);
        const arrayBuffer = await response.arrayBuffer();
        audioData = new Uint8Array(arrayBuffer);
      } else {
        const base64 = await synthesizeVoice(text, voiceId);
        audioData = decode(base64);
      }

      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        currentVoiceSource.current = source;
        source.onended = () => setIsSynthesizing(false);
      }
    } catch (e) {
      console.error("Voice Playback Failed", e);
      setIsSynthesizing(false);
    }
  };

  // Auto-Voice & Auto-Advance Effect
  useEffect(() => {
    if (!currentEvent || isLogicNode) return;

    const timeout = setTimeout(() => {
      // 1. Handle Voice Playback (Only if explicitly provided as an asset)
      if ((currentEvent.type === EventType.DIALOGUE || currentEvent.type === EventType.NARRATION) && currentEvent.text && currentEvent.visible !== false) {
        if (currentEvent.voiceAssetId) {
          playVoice(currentEvent.text, '', resolveImageUrl(currentEvent.voiceAssetId));
        }
      }

      // 2. Handle Auto-Advance for Non-Dialogue Events (like Actor Enter/Exit without text)
      else if ((currentEvent.type === EventType.CHAR_ENTER || currentEvent.type === EventType.CHAR_EXIT || currentEvent.type === EventType.MUSIC_CHANGE) && !currentEvent.text) {
        addLog(`Auto-advancing non-text event: ${currentEvent.type}`);
        nextEvent();
      }
    }, 100); // Slight delay to ensure text/state is rendering

    return () => clearTimeout(timeout);
  }, [currentEventIndex, gameState.currentSceneId, narratorVoice]);

  const handleSynthesize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentEvent?.text) {
      if (currentEvent.voiceAssetId) {
        playVoice(currentEvent.text, '', resolveImageUrl(currentEvent.voiceAssetId));
      } else if (currentChar?.voiceId && currentChar.voiceId !== 'None') {
        playVoice(currentEvent.text, currentChar.voiceId);
      }
    }
  };

  const bgSrc = resolveImageUrl(nodeData?.backgroundImage);
  const charSrc = currentEvent?.visible !== false && !isLogicNode ? resolveImageUrl(currentImg?.url) : null;

  // ERROR SCREEN
  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-12 text-center select-text">
        <div className="bg-rose-500/10 border border-rose-500/50 p-8 rounded-3xl max-w-2xl w-full flex flex-col gap-6 backdrop-blur-xl">
          <div className="flex flex-col gap-2 items-center">
            <div className="p-4 bg-rose-500 rounded-full text-white mb-2 shadow-lg shadow-rose-500/20">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-black text-rose-400 uppercase tracking-widest">Runtime Error</h2>
          </div>

          <div className="bg-black/40 p-6 rounded-xl border border-rose-500/20 font-mono text-xs text-rose-200 text-left overflow-auto max-h-48">
            {error}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { setError(null); onClose(); }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>

        {/* DEBUG OVERLAY */}
        <div className="absolute top-8 right-8 z-[80] bg-black/80 text-green-400 p-2 rounded border border-green-800 font-mono text-[10px] pointer-events-none text-left min-w-[200px]">
          <div>Node: {gameState.currentSceneId}</div>
          <div>Edges: {edges.length}</div>
          <div className="mt-2 border-t border-green-900 pt-1 text-green-600">Events:</div>
          <div className="max-h-[300px] overflow-hidden flex flex-col justify-end text-[9px] opacity-70">
            {logs.map((L, i) => <div key={i}>{L}</div>)}
          </div>
        </div>
      </div>
    );
  }

  // Safety check for invalid node
  if (!currentNode && !error) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-rose-500">
        <h1 className="text-4xl font-black">CRITICAL FAILURE</h1>
        <p className="font-mono mt-4">Node ID "{gameState.currentSceneId}" not found in graph.</p>
        <button onClick={onClose} className="mt-8 px-8 py-3 bg-rose-500 text-white font-bold rounded-xl">EXIT</button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center font-inter select-none overflow-hidden"
      onMouseMove={(e) => isDragging && setDialoguePos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))}
      onMouseUp={() => setIsDragging(false)}
    >
      <div className="w-full h-full bg-slate-950 overflow-hidden flex flex-col relative">
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-[60] pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setShowMonitor(!showMonitor)}
              className={`px-3 py-2 rounded-xl text-white/50 border border-white/10 hover:bg-white/10 transition-colors ${showMonitor ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-black/40'}`}
              title="Toggle Variable Monitor"
            >
              <Activity size={14} />
            </button>
          </div>
          <div className="flex gap-2 pointer-events-auto items-center">
            <label className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10 text-white/50 text-[10px] font-bold uppercase cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={e => setShowDebug(e.target.checked)}
                className="accent-rose-500 w-3 h-3"
              />
              Debug Info
            </label>
            {gameState.activeMusicId && (
              <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] font-black text-indigo-400">
                <Music size={12} className="animate-pulse" /> AUDIO FLOWING
              </div>
            )}
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500 text-white rounded-xl transition-all border border-white/10"><X size={20} /></button>
          </div>
        </div>

        {showMonitor && <AttributeMonitor
          gameState={gameState}
          gameAttributes={initialGameAttrs}
          characters={characters}
          onClose={() => setShowMonitor(false)}
        />}

        {/* DEBUG OVERLAY */}
        {showDebug && (
          <div className="fixed top-20 right-8 z-[99999] bg-black/90 text-red-500 p-4 rounded-xl border-2 border-red-500 font-mono text-xs pointer-events-auto text-left min-w-[250px] shadow-2xl">
            <div className="font-bold border-b border-red-900/50 pb-2 mb-2">DEBUG MODE ACTIVE</div>
            <div>ID: {gameState.currentSceneId}</div>
            <div>Type: {currentNode?.type || 'UNDEFINED'}</div>
            <div>Event: {currentEventIndex} / {nodeData?.events?.length || 0}</div>
            <div className="mt-2 border-t border-red-900/50 pt-1 text-red-400">Events:</div>
            <div className="max-h-[300px] overflow-y-auto flex flex-col justify-end text-[10px] opacity-90 mb-2 font-bold">
              {logs.map((L, i) => <div key={i}>{L}</div>)}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); nextNode(); }}
              className="w-full bg-red-900/50 hover:bg-red-800 text-white py-2 rounded-lg border border-red-500 font-bold tracking-widest"
            >
              FORCE NEXT
            </button>
          </div>
        )}

        <div className="absolute inset-0 z-0 bg-slate-900" onClick={() => !isLogicNode && nextEvent()}>
          <img
            src={bgSrc}
            className="w-full h-full object-cover transition-opacity duration-1000"
            alt="Scene Background"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {charSrc && (
            <div
              className="absolute transition-all duration-700 ease-out pointer-events-none"
              style={{
                left: `${currentEvent?.x ?? 50}%`,
                top: `${currentEvent?.y ?? 55}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20
              }}
            >
              <div className="relative group">
                <img
                  src={charSrc}
                  className="h-[80vh] w-auto max-w-[90vw] object-contain drop-shadow-[0_0_80px_rgba(0,0,0,0.6)]"
                  alt={currentChar?.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('dicebear')) {
                      target.src = getPlaceholder('char', currentChar?.id || 'anon');
                    }
                  }}
                />
              </div>
            </div>
          )}

          {isLogicNode && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-3xl rounded-[48px] p-12 border border-white/10 shadow-2xl flex flex-col gap-8" onClick={e => e.stopPropagation()}>
                <div className="space-y-2 text-center">
                  <h3 className="text-3xl font-black text-white tracking-tight">{nodeData.title}</h3>
                  <p className="text-slate-400 text-sm">Select your path.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {nodeData.choices?.filter(c => {
                    if (!c.nextNodeId) return false;
                    if (!c.logicRoot) return true;

                    const check = (cond: any): boolean => {
                      if (cond.type === 'GROUP') {
                        if (!cond.conditions || cond.conditions.length === 0) return true;
                        const results = cond.conditions.map((child: any) => check(child));
                        return cond.operator === 'OR' ? results.some((r: boolean) => r) : results.every((r: boolean) => r);
                      }

                      if (cond.type === 'EXPRESSION') {
                        if (!cond.expression) return true;
                        const context: any = {};
                        initialGameAttrs.forEach(a => context[a.key] = gameState.gameAttributes[a.id] ?? a.initialValue);
                        characters.forEach(c => {
                          c.attributes.forEach(a => {
                            context[a.key] = (gameState.characterAttributes[c.id]?.[a.id] ?? a.initialValue);
                          });
                        });
                        try {
                          const keys = Object.keys(context);
                          const values = Object.values(context);
                          const formulaFunc = new Function(...keys, `return ${cond.expression};`);
                          return !!formulaFunc(...values);
                        } catch (e) {
                          return false;
                        }
                      }

                      const currentVal = gameState.gameAttributes[cond.attributeId || ''] ?? 0;
                      const targetVal = cond.value ?? 0;

                      switch (cond.comparison) {
                        case '>': return currentVal > targetVal;
                        case '<': return currentVal < targetVal;
                        case '==': return currentVal === targetVal;
                        case '!=': return currentVal !== targetVal;
                        case '>=': return currentVal >= targetVal;
                        case '<=': return currentVal <= targetVal;
                        default: return false;
                      }
                    };
                    return check(c.logicRoot);
                  }).map(choice => (
                    <button
                      key={choice.id}
                      onClick={() => nextNode(choice.nextNodeId)}
                      className="w-full bg-white/5 hover:bg-blue-600/50 hover:border-blue-500 p-6 rounded-3xl text-left transition-all border border-white/5 flex items-center justify-between group"
                      style={{
                        background: !dialogueStyle?.optionButtonImage?.source ? 'rgba(255,255,255,0.05)' : undefined
                      }}
                    >
                      <span className="font-bold text-lg text-white group-hover:text-blue-200 transition-colors">{choice.text}</span>
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-white" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Explicit Setter Node Feedback */}
          {currentNode?.type === 'SETTER' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950">
              <div className="flex flex-col items-center gap-4 text-cyan-500">
                <Loader2 size={48} className="animate-spin" />
                <div className="text-xl font-bold font-mono tracking-widest uppercase">Updating Variables...</div>
                <div className="text-xs text-slate-500 font-mono">
                  {edges.filter(e => e.source === currentNode.id).length === 0 ? (
                    <span className="text-rose-500 font-bold flex items-center gap-2">
                      <Activity size={14} /> ERROR: No Outgoing Connection!
                    </span>
                  ) : "Calculating next step..."}
                </div>
              </div>
            </div>
          )}

          {/* MAIN MENU NODE RENDER */}
          {currentNode?.type === 'MENU' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm select-none">
              {/* Menu Background */}
              {nodeData.backgroundImage && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={resolveImageUrl(nodeData.backgroundImage)}
                    className="w-full h-full object-cover opacity-60"
                    alt="Menu BG"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center gap-12 animate-in fade-in zoom-in duration-1000">
                <div className="text-center space-y-4">
                  <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-white to-purple-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-tighter uppercase">
                    {nodeData.title || "AdventureForge"}
                  </h1>
                  <p className="text-xl text-indigo-200/80 font-light tracking-[0.5em] uppercase border-t border-indigo-500/30 pt-4">
                    {nodeData.subtitle || "Interactive Story"}
                  </p>
                </div>

                <div className="flex flex-col gap-4 w-64">
                  <button
                    onClick={() => {
                      const startEdge = edges.find(e => e.source === currentNode.id && e.sourceHandle === 'start');
                      if (startEdge) nextNode(startEdge.target);
                      else alert("No 'Start' connection found! Connect the Menu 'Start' handle.");
                    }}
                    className="group relative px-8 py-4 bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 rounded-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white tracking-widest uppercase group-hover:pl-2 transition-all">Start Game</span>
                      <ChevronRight className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" size={16} />
                    </div>
                  </button>

                  <button
                    onClick={() => setSaveLoadMode('LOAD')}
                    className="group px-8 py-4 bg-white/5 hover:bg-slate-800 border border-white/10 rounded-xl transition-all duration-300 text-left"
                  >
                    <span className="text-xs font-bold text-slate-400 group-hover:text-white tracking-widest uppercase">Load Game</span>
                  </button>

                  <button
                    onClick={() => alert("Settings functionality coming in Phase 3.")}
                    className="group px-8 py-4 bg-white/5 hover:bg-slate-800 border border-white/10 rounded-xl transition-all duration-300 text-left"
                  >
                    <span className="text-xs font-bold text-slate-400 group-hover:text-white tracking-widest uppercase">Settings</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="group px-8 py-4 bg-white/5 hover:bg-rose-900/40 border border-white/10 hover:border-rose-500/50 rounded-xl transition-all duration-300 text-left mt-4"
                  >
                    <span className="text-xs font-bold text-slate-500 group-hover:text-rose-400 tracking-widest uppercase">Exit Desktop</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* END NODE RENDER */}
          {currentNode?.type === 'END' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black animate-in fade-in duration-2000">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-6xl font-black text-rose-500 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                    {nodeData.title || "The End"}
                  </h1>
                  <p className="text-xl text-slate-500 italic max-w-md mx-auto">
                    {nodeData.description || "Thanks for playing."}
                  </p>
                </div>

                <div className="flex flex-col gap-4 pt-12">
                  {nodes.find(n => n.type === 'MENU') && (
                    <button
                      onClick={() => {
                        const menuNode = nodes.find(n => n.type === 'MENU');
                        if (menuNode) {
                          setGameState(prev => ({
                            ...prev,
                            currentSceneId: menuNode.id,
                            history: []
                          }));
                          setCurrentEventIndex(0);
                        }
                      }}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all hover:scale-105"
                    >
                      Return to Title
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold rounded-xl uppercase tracking-widest transition-all"
                  >
                    Exit Desktop
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {!isLogicNode && currentNode?.type !== 'MENU' && currentNode?.type !== 'END' && currentEvent && currentEvent.text && (
          <div
            className="absolute z-40 cursor-default px-6 transition-all duration-300"
            style={{
              width: dialogueStyle ? `${dialogueStyle.width ?? 90}%` : '100%',
              maxWidth: 'none',
              left: dialogueStyle ? `${dialogueStyle.xPosition ?? 50}%` : '50%',
              transform: `translate(calc(-50% + ${dialoguePos.x}px), ${dialoguePos.y}px)`,
              bottom: dialogueStyle ? `${dialogueStyle.yPosition}%` : '3rem',
              ...(currentChar && themes[currentChar.name.toLowerCase()]?.boxPosition === 'top' ? { bottom: 'auto', top: '2rem' } : {})
            }}
            onMouseDown={(e) => (e.target as HTMLElement).closest('.drag-handle') && setIsDragging(true)}
            onClick={e => e.stopPropagation()}
          >
            <div ref={measureRef} className="invisible absolute top-0 left-0 pointer-events-none p-0" />

            <div
              ref={dialogueRef}
              onClick={(e) => handleNextClick(e)}
              className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col gap-6 group/box relative transition-all duration-300"
              style={{
                background: (dialogueStyle?.boxColor || 'rgba(2, 6, 23, 0.9)'),
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: dialogueStyle ? `${dialogueStyle.height}vh` : 'auto',
                alignItems: 'flex-start'
              }}
            >
              <div className="drag-handle absolute top-0 left-0 right-0 h-10 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover/box:opacity-100 transition-opacity">
                <div className="w-12 h-1 bg-white/10 rounded-full" />
              </div>

              <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <MessageSquare size={16} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.4em]" style={{ color: '#60a5fa' }}>
                    {currentChar?.name || 'SYSTEM'}
                  </span>
                </div>
                <div className="h-px flex-1 bg-white/10" />
                {currentEvent.type === EventType.DIALOGUE && currentChar && (
                  <button onClick={handleSynthesize} disabled={isSynthesizing} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-20">
                    {isSynthesizing ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Volume2 size={18} />}
                  </button>
                )}
              </div>

              <div className="flex-1 flex w-full">
                <p className="text-[24px] font-medium leading-relaxed tracking-tight" style={{ color: '#f1f5f9' }}>
                  {displayedText}
                  <span className={`inline-block w-1 h-6 ml-1 bg-current align-middle ${isTyping ? 'animate-pulse' : 'hidden'}`} />
                </p>
              </div>

              <div className="flex justify-end pt-2 w-full min-h-[24px]">
                {(!isTyping && pageIndex === pages.length - 1) && (
                  <button onClick={(e) => handleNextClick(e)} className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-slate-500 hover:text-white transition-colors group/next">
                    CONTINUE <ChevronRight size={16} className="group-hover/next:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save/Load Modal */}
        {saveLoadMode && (
          <SaveLoadModal
            mode={saveLoadMode}
            gameState={gameState}
            currentLocationName={currentNode?.data.title || "Unknown"}
            onClose={() => setSaveLoadMode(null)}
            onLoad={(slot) => { setGameState(slot.gameState); setSaveLoadMode(null); }}
            onSave={() => setSaveLoadMode(null)}
          />
        )}

        {/* SAVE HUD Button */}
        {currentNode?.type !== 'MENU' && currentNode?.type !== 'END' && (
          <button
            onClick={() => setSaveLoadMode('SAVE')}
            className="absolute top-4 right-16 z-50 p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-white/10 backdrop-blur-sm"
            title="Save Game"
          >
            <Save size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
