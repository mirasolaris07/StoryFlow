
import React, { useState, useMemo, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
    X,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    BrainCircuit,
    Loader2,
    Play,
    Layers,
    History,
    Settings,
    Edit3,
    Check
} from 'lucide-react';
import { NodeType, NodeData, Character, SceneEvent, EventType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface ScenarioEditorProps {
    nodes: Node[];
    edges: Edge[];
    selectedNodeIds: string[];
    characters: Character[];
    onUpdateNode: (id: string, data: Partial<NodeData>) => void;
    onClose: () => void;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
    nodes,
    edges,
    selectedNodeIds,
    characters,
    onUpdateNode,
    onClose
}) => {
    const [lookAhead, setLookAhead] = useState(3);
    const [lookBack, setLookBack] = useState(2);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

    // Initialize active node from selected nodes
    useEffect(() => {
        if (selectedNodeIds.length > 0 && !activeNodeId) {
            setActiveNodeId(selectedNodeIds[0]);
        }
    }, [selectedNodeIds, activeNodeId]);

    // Build the "Roadmap" (sequence of nodes) for the editor
    const sequence = useMemo(() => {
        // We base the sequence on the active node, but include all initially selected nodes if they are within range
        const focusNodeId = activeNodeId || (selectedNodeIds.length > 0 ? selectedNodeIds[0] : null);
        if (!focusNodeId) return [];

        const result: Node[] = [];
        const visited = new Set<string>();

        // Helper to get nodes in a specific direction
        const traverse = (nodeId: string, depth: number, direction: 'UP' | 'DOWN'): Node[] => {
            if (depth <= 0) return [];
            const relevantEdges = direction === 'UP'
                ? edges.filter(e => e.target === nodeId)
                : edges.filter(e => e.source === nodeId);

            const foundNodes: Node[] = [];
            relevantEdges.forEach(e => {
                const nextId = direction === 'UP' ? e.source : e.target;
                const nextNode = nodes.find(n => n.id === nextId);
                if (nextNode && !visited.has(nextNode.id)) {
                    visited.add(nextNode.id);
                    if (direction === 'UP') {
                        foundNodes.unshift(...traverse(nextNode.id, depth - 1, 'UP'), nextNode);
                    } else {
                        foundNodes.push(nextNode, ...traverse(nextNode.id, depth - 1, 'DOWN'));
                    }
                }
            });
            return foundNodes;
        };

        const focusNode = nodes.find(n => n.id === focusNodeId);
        if (!focusNode) return [];

        visited.add(focusNode.id);
        const upstream = traverse(focusNode.id, lookBack, 'UP');
        const downstream = traverse(focusNode.id, lookAhead, 'DOWN');

        return [...upstream, focusNode, ...downstream];
    }, [nodes, edges, activeNodeId, selectedNodeIds, lookAhead, lookBack]);

    const getAIConfig = () => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
        const model = "gemini-2.0-flash-lite";
        return { apiKey, model };
    };

    const handleGenerate = async (nodeId: string) => {
        const config = getAIConfig();
        if (!config.apiKey) {
            alert("GEMINI_API_KEY is missing in environment.");
            return;
        }

        setIsSynthesizing(true);
        const ai = new GoogleGenAI({ apiKey: config.apiKey });

        const targetNode = nodes.find(n => n.id === nodeId);
        if (!targetNode) return;

        // Build context prompt
        const nodeIdx = sequence.findIndex(n => n.id === nodeId);
        const pastSequence = sequence.slice(Math.max(0, nodeIdx - lookBack), nodeIdx);
        const futureSequence = sequence.slice(nodeIdx + 1, nodeIdx + 1 + lookAhead);

        const pastContext = pastSequence.map(n => `[${n.data.title}]: ${n.data.events?.map((e: any) => e.text).join(' ') || n.data.description || ""}`).join('\n');
        const futureContext = futureSequence.map(n => `[${n.data.title}]: ${n.data.description || ""}`).join('\n');

        const prompt = `
      You are a Creative Scenario Writer.
      GENERATE SCENE DIALOGUE AND NARRATION FOR THE NODE: "${targetNode.data.title}"
      
      CONTEXT FROM PREVIOUS NODES:
      ${pastContext || "Start of story."}

      PLANNED FUTURE NODES:
      ${futureContext || "End of story branch."}

      AVAILABLE CHARACTERS:
      ${characters.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

      INSTRUCTIONS:
      Generate 3-6 events (Dialogue or Narration). 
      If it's dialogue, specify the characterId.
      Return a JSON array of event objects.
      SCHEMA: [{ type: "DIALOGUE" | "NARRATION", characterId: string, text: string }]
    `;

        try {
            const result = await (ai as any).models.generateContent({
                model: config.model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ["DIALOGUE", "NARRATION"] },
                                characterId: { type: Type.STRING },
                                text: { type: Type.STRING }
                            },
                            required: ["type", "text"]
                        }
                    }
                }
            });

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                const generatedEvents = JSON.parse(text);
                const newEvents: SceneEvent[] = generatedEvents.map((ge: any) => ({
                    id: `evt-${Date.now()}-${Math.random()}`,
                    type: ge.type as EventType,
                    characterId: ge.characterId || undefined,
                    text: ge.text
                }));

                onUpdateNode(nodeId, { events: [...(targetNode.data.events || []), ...newEvents] });
            }
        } catch (e) {
            console.error("Generation failed:", e);
            alert("Generation failed. Check console.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-7xl h-full rounded-[40px] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">

                {/* Header */}
                <header className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Scenario Architect</h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Neural Narrative Synchronization</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700">
                            <div className="px-4 py-2 space-y-1">
                                <div className="flex justify-between items-center gap-8">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Look Back</label>
                                    <span className="text-[9px] font-black text-indigo-400">{lookBack} Nodes</span>
                                </div>
                                <input
                                    type="range" min="0" max="5" value={lookBack}
                                    onChange={(e) => setLookBack(parseInt(e.target.value))}
                                    className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div className="w-px h-8 bg-slate-700" />
                            <div className="px-4 py-2 space-y-1">
                                <div className="flex justify-between items-center gap-8">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Look Ahead</label>
                                    <span className="text-[9px] font-black text-emerald-400">{lookAhead} Nodes</span>
                                </div>
                                <input
                                    type="range" min="0" max="10" value={lookAhead}
                                    onChange={(e) => setLookAhead(parseInt(e.target.value))}
                                    className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>

                        <button onClick={onClose} className="p-3 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Roadmap Sidebar */}
                    <aside className="w-80 border-r border-slate-800 bg-slate-900/40 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Layers size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Story Roadmap</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{sequence.length} Nodes</span>
                        </div>

                        {sequence.map((node, idx) => {
                            const isActive = activeNodeId === node.id;
                            const isSelectedInGraph = selectedNodeIds.includes(node.id);
                            return (
                                <button
                                    key={node.id}
                                    onClick={() => {
                                        setActiveNodeId(node.id);
                                        const el = document.getElementById(`scenario-node-${node.id}`);
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all group relative ${isActive
                                            ? 'bg-indigo-600 shadow-xl shadow-indigo-900/40 border-indigo-400 text-white'
                                            : isSelectedInGraph
                                                ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-100'
                                                : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 text-slate-400'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-200' : 'opacity-50'}`}>Node {idx + 1}</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${node.type === 'SCENE' ? (isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400') :
                                                node.type === 'LOGIC' ? (isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400') :
                                                    'bg-slate-700 text-slate-400'
                                            }`}>
                                            {node.type}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold truncate">{node.data.title}</p>
                                </button>
                            );
                        })}
                    </aside>

                    {/* Main Scenario Canvas */}
                    <main className="flex-1 bg-slate-950/50 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                        {sequence.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center border border-slate-800">
                                    <History size={48} className="text-slate-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">No nodes selected</h3>
                                    <p className="text-slate-500 text-sm max-w-sm">Select nodes on the graph to begin generating then fine-tuning your story scenario.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {sequence.map((node) => (
                                    <div
                                        key={node.id}
                                        id={`scenario-node-${node.id}`}
                                        className={`p-8 rounded-[32px] border transition-all ${node.id === activeNodeId
                                                ? 'bg-slate-900 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 scale-[1.01] ring-1 ring-indigo-500/20'
                                                : selectedNodeIds.includes(node.id)
                                                    ? 'bg-slate-900 border-indigo-500/20 shadow-xl'
                                                    : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <header className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${node.type === 'SCENE' ? 'bg-blue-600/20 text-blue-400' :
                                                    node.type === 'LOGIC' ? 'bg-amber-600/20 text-amber-400' :
                                                        'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {node.type === 'SCENE' ? <Edit3 size={24} /> : <BrainCircuit size={24} />}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white">{node.data.title}</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                        {node.data.events?.length || 0} Events &bull; {node.data.choices?.length || 0} Outgoing Path(s)
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleGenerate(node.id)}
                                                disabled={isSynthesizing}
                                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-900/20"
                                            >
                                                {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                SYNTHESIZE
                                            </button>
                                        </header>

                                        <div className="space-y-4">
                                            {node.data.events?.map((event: SceneEvent, idx: number) => {
                                                const character = characters.find(c => c.id === event.characterId);
                                                return (
                                                    <div key={event.id} className="group relative">
                                                        <div className={`p-5 rounded-2xl border transition-all ${event.type === EventType.DIALOGUE
                                                            ? 'bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/30'
                                                            : 'bg-white/5 border-transparent italic'
                                                            }`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${event.type === EventType.DIALOGUE ? 'text-indigo-400' : 'text-slate-500'
                                                                        }`}>
                                                                        {event.type}
                                                                    </span>
                                                                    {character && (
                                                                        <>
                                                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                                            <span className="text-[10px] font-black text-slate-300">{character.name}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <textarea
                                                                className="w-full bg-transparent border-none focus:ring-0 text-slate-200 text-sm leading-relaxed resize-none p-0"
                                                                value={event.text}
                                                                rows={1}
                                                                onChange={(e) => {
                                                                    const newEvents = node.data.events.map((ev: any) => ev.id === event.id ? { ...ev, text: e.target.value } : ev);
                                                                    onUpdateNode(node.id, { events: newEvents });
                                                                }}
                                                                onInput={(e: any) => {
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {(!node.data.events || node.data.events.length === 0) && (
                                            <div className="py-12 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 gap-3">
                                                <History size={24} />
                                                <p className="text-xs font-bold uppercase tracking-widest text-center">Empty Context<br />Generate to start</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="flex flex-col items-center py-12 opacity-20">
                                    <div className="w-10 h-10 border-2 border-slate-700 rounded-full flex items-center justify-center mb-4">
                                        <BrainCircuit size={20} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">End of Synthesis Context</p>
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

const Zap = ({ className, size = 24 }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
