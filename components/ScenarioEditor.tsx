
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
    Check,
    Box
} from 'lucide-react';
import { NodeType, NodeData, Character, SceneEvent, EventType, ScenarioVariant } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// Always use process.env.API_KEY directly as a named parameter.
const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY });

interface ScenarioEditorProps {
    nodes: Node[];
    edges: Edge[];
    selectedNodeIds: string[];
    characters: Character[];
    onUpdateNode: (id: string, data: Partial<NodeData>) => void;
    onBatchUpdateNodes: (updates: Record<string, Partial<NodeData>>) => void;
    onClose: () => void;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
    nodes,
    edges,
    selectedNodeIds,
    characters,
    onUpdateNode,
    onBatchUpdateNodes,
    onClose
}) => {
    const [lookAhead, setLookAhead] = useState(3);
    const [lookBack, setLookBack] = useState(2);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [modificationDirection, setModificationDirection] = useState('');
    const [variants, setVariants] = useState<ScenarioVariant[]>([]);
    const [activeVariantId, setActiveVariantId] = useState<'original' | string>('original');

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
        // Match the pattern used in geminiService.ts which works for TTS
        const apiKey = (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY;
        const model = "gemini-2.5-flash-lite";
        return { apiKey, model };
    };

    const handleSynthesizeBranches = async () => {
        const config = getAIConfig();
        if (!config.apiKey) {
            alert("GEMINI_API_KEY is missing in environment.");
            return;
        }

        setIsSynthesizing(true);

        // 1. Identify Target Nodes
        const selectedIndices = sequence
            .map((n, i) => selectedNodeIds.includes(n.id) ? i : -1)
            .filter(i => i !== -1);

        if (selectedIndices.length === 0) {
            setIsSynthesizing(false);
            return;
        }

        const firstSelectedIdx = Math.min(...selectedIndices);
        const lastSelectedIdx = Math.max(...selectedIndices);

        // n-before and m-after
        const pastContextSequence = sequence.slice(Math.max(0, firstSelectedIdx - lookBack), firstSelectedIdx);
        const futureContextSequence = sequence.slice(lastSelectedIdx + 1, lastSelectedIdx + 1 + lookAhead);
        const targetSequence = sequence.slice(firstSelectedIdx, lastSelectedIdx + 1);

        // 2. Topological Chunking
        const chunks: Node[][] = [];
        let currentChunk: Node[] = [];

        targetSequence.forEach((node, i) => {
            currentChunk.push(node);

            // Check for topology boundary
            const incoming = edges.filter(e => e.target === node.id).length;
            const outgoing = edges.filter(e => e.source === node.id).length;
            const isBoundary = incoming > 1 || outgoing > 1;

            if (isBoundary && i < targetSequence.length - 1) {
                chunks.push(currentChunk);
                currentChunk = [];
            }
        });
        if (currentChunk.length > 0) chunks.push(currentChunk);

        // 3. Iterative Generation
        // We'll generate 2 variants: "Alpha" and "Beta"
        const variantAlpha: Record<string, SceneEvent[]> = {};
        const variantBeta: Record<string, SceneEvent[]> = {};

        try {
            // Context from previous chunks (if any)
            let runningContextAlpha = pastContextSequence.map(n => `[${n.data.title}]: ${n.data.events?.map(e => e.text).join(' ') || n.data.description || ""}`).join('\n');
            let runningContextBeta = runningContextAlpha;

            for (const chunk of chunks) {
                // Generate for this chunk
                const chunkTitles = chunk.map(n => n.data.title).join(", ");

                const promptTemplate = (context: string, name: string) => `
                    You are the "Neural Architect" for a branching story.
                    TASK: Generate an alternative narrative branch (Variant ${name}) for: ${chunkTitles}
                    
                    USER DIRECTION: "${modificationDirection || "Make it more interesting and natural."}"
                    
                    CONTEXT (PREVIOUS EVENTS):
                    ${context || "Start of scene."}
                    
                    WINDOWED FUTURE (TARGETS TO REACH):
                    ${futureContextSequence.map(n => `[${n.data.title}]: ${n.data.description || ""}`).join('\n') || "End of branch."}

                    GRAPH TOPOLOGY AWARENESS:
                    ${chunk.map(n => {
                    const inEdges = edges.filter(e => e.target === n.id);
                    const outEdges = edges.filter(e => e.source === n.id);
                    let msg = "";
                    if (inEdges.length > 1) {
                        msg += `- Node "${n.data.title}" is a CONVERGENCE point for ${inEdges.length} incoming paths. Keep dialogue logically consistent for any path taken.\n`;
                    }
                    if (outEdges.length > 1) {
                        msg += `- Node "${n.data.title}" FORKS into paths: ${outEdges.map(e => e.label || "Choice").join(", ")}. Ensure dialogue leads to these choices.\n`;
                    }
                    return msg;
                }).join('\n')}

                    TARGET NODES TO FILL:
                    ${chunk.map(n => `- "${n.data.title}" (Original Desc: ${n.data.description || "None"})`).join('\n')}

                    CHARACTERS:
                    ${characters.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

                    INSTRUCTIONS:
                    Return a JSON object mapping each node title to an array of SceneEvents.
                    SCHEMA: { "Node Title": [{ type: "DIALOGUE" | "NARRATION", characterId: string, text: string }] }
                `;

                // Parallel calls for Alpha and Beta variants
                const [resA, resB] = await Promise.all([
                    (ai as any).models.generateContent({
                        model: config.model,
                        contents: [{ role: 'user', parts: [{ text: promptTemplate(runningContextAlpha, "Alpha") }] }],
                        config: { responseMimeType: "application/json" }
                    }),
                    (ai as any).models.generateContent({
                        model: config.model,
                        contents: [{ role: 'user', parts: [{ text: promptTemplate(runningContextBeta, "Beta") }] }],
                        config: { responseMimeType: "application/json" }
                    })
                ]);

                const dataA = JSON.parse(resA.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
                const dataB = JSON.parse(resB.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

                // Map back to Node IDs and update running context
                chunk.forEach(node => {
                    const eventsA = dataA[node.data.title] || [];
                    const eventsB = dataB[node.data.title] || [];

                    const mappedA = eventsA.map((e: any) => ({ ...e, id: `ai-${Math.random()}`, type: e.type as EventType }));
                    const mappedB = eventsB.map((e: any) => ({ ...e, id: `ai-${Math.random()}`, type: e.type as EventType }));

                    variantAlpha[node.id] = mappedA;
                    variantBeta[node.id] = mappedB;

                    runningContextAlpha += `\n[${node.data.title}]: ${mappedA.map((e: any) => e.text).join(' ')}`;
                    runningContextBeta += `\n[${node.data.title}]: ${mappedB.map((e: any) => e.text).join(' ')}`;
                });
            }

            setVariants([
                { id: 'alpha', name: 'Variant Alpha', nodeChanges: variantAlpha },
                { id: 'beta', name: 'Variant Beta', nodeChanges: variantBeta }
            ]);
            setActiveVariantId('alpha');

        } catch (e) {
            console.error("Neural Architecture failed:", e);
            alert("Synthesis failed. Check connectivity.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handleApplyVariant = () => {
        if (activeVariantId === 'original') return;
        const variant = variants.find(v => v.id === activeVariantId);
        if (!variant) return;

        const updates: Record<string, Partial<NodeData>> = {};
        (Object.entries(variant.nodeChanges) as [string, SceneEvent[]][]).forEach(([nodeId, events]) => {
            updates[nodeId] = { events };
        });

        onBatchUpdateNodes(updates);
        setVariants([]);
        setActiveVariantId('original');
    };

    // Helper to get events for a node based on current view mode
    const getVisibleEvents = (nodeId: string) => {
        if (activeVariantId === 'original') {
            return nodes.find(n => n.id === nodeId)?.data.events || [];
        }
        const variant = variants.find(v => v.id === activeVariantId);
        return variant?.nodeChanges[nodeId] || [];
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-500">
            <div className="bg-slate-900 border border-slate-800/50 w-full max-w-7xl h-full rounded-[40px] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/10">

                {/* Header */}
                <header className="px-10 py-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-2xl">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-2 ring-white/20">
                            <Zap className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Neural Architect</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Live Synchronization Active</span>
                                <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Context Window: {lookBack + lookAhead + selectedNodeIds.length} Nodes</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Comparison Switcher */}
                        {variants.length > 0 && (
                            <div className="flex bg-slate-800/80 p-1.5 rounded-[20px] border border-slate-700/50 shadow-inner">
                                <button
                                    onClick={() => setActiveVariantId('original')}
                                    className={`px-5 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${activeVariantId === 'original' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Original
                                </button>
                                {variants.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVariantId(v.id)}
                                        className={`px-5 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${activeVariantId === v.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="hidden xl:flex items-center gap-4 bg-slate-800/30 p-1.5 rounded-[22px] border border-slate-700/30">
                            <div className="px-5 py-2 space-y-1">
                                <div className="flex justify-between items-center gap-10">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Look Back</label>
                                    <span className="text-[9px] font-black text-indigo-400">{lookBack} Nodes</span>
                                </div>
                                <input
                                    type="range" min="0" max="5" value={lookBack}
                                    onChange={(e) => setLookBack(parseInt(e.target.value))}
                                    className="w-32 h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div className="w-px h-10 bg-slate-800" />
                            <div className="px-5 py-2 space-y-1">
                                <div className="flex justify-between items-center gap-10">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Look Ahead</label>
                                    <span className="text-[9px] font-black text-emerald-400">{lookAhead} Nodes</span>
                                </div>
                                <input
                                    type="range" min="0" max="10" value={lookAhead}
                                    onChange={(e) => setLookAhead(parseInt(e.target.value))}
                                    className="w-32 h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>

                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-slate-800 text-slate-500 hover:text-white rounded-2xl transition-all border border-transparent hover:border-slate-700">
                            <X size={24} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Roadmap Sidebar */}
                    <aside className="w-80 border-r border-slate-800/50 bg-slate-900/40 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Layers size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sequence Roadmap</span>
                            </div>
                            <span className="text-[9px] font-black bg-slate-800/80 text-slate-500 px-2.5 py-1 rounded-full border border-slate-700/50">{sequence.length} Nodes</span>
                        </div>

                        {sequence.map((node, idx) => {
                            const isSelectedInGraph = selectedNodeIds.includes(node.id);
                            const isActive = activeNodeId === node.id;

                            return (
                                <button
                                    key={node.id}
                                    onClick={() => setActiveNodeId(node.id)}
                                    className={`w-full group relative flex flex-col gap-2 p-5 rounded-[24px] border transition-all duration-300 text-left ${isActive
                                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl shadow-black/20'
                                        : isSelectedInGraph
                                            ? 'bg-slate-800/40 border-indigo-400/20 hover:bg-slate-800/60'
                                            : 'bg-transparent border-transparent hover:bg-slate-800/30'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border ${isActive ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                {node.data.title}
                                            </span>
                                        </div>
                                        {isSelectedInGraph && <Sparkles size={12} className="text-indigo-400 animate-pulse" />}
                                    </div>
                                    <p className="text-[10px] text-slate-600 line-clamp-1 pl-8 font-medium italic">
                                        {node.data.description || "No description provided"}
                                    </p>

                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </aside>

                    {/* Main Workspace */}
                    <main className="flex-1 flex flex-col bg-slate-950/20 relative">
                        {/* Direction Bar */}
                        <div className="p-8 border-b border-slate-800/50 bg-slate-900/30">
                            <div className="flex items-start gap-6 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 shadow-2xl">
                                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-700">
                                    <Edit3 className="text-indigo-400 w-6 h-6" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modification Direction</label>
                                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Affects {selectedNodeIds.length} Selected Nodes</span>
                                    </div>
                                    <textarea
                                        value={modificationDirection}
                                        onChange={(e) => setModificationDirection(e.target.value)}
                                        placeholder="Enter instructions for alternative branching (e.g. 'Make it more dramatic', 'Add a secret plot twist')..."
                                        className="w-full bg-transparent border-none outline-none text-slate-200 text-sm font-bold placeholder:text-slate-700 resize-none h-16 custom-scrollbar"
                                    />
                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        {variants.length > 0 && activeVariantId !== 'original' && (
                                            <button
                                                onClick={handleApplyVariant}
                                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                            >
                                                <Check size={14} />
                                                Commit {variants.find(v => v.id === activeVariantId)?.name}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSynthesizeBranches}
                                            disabled={isSynthesizing || selectedNodeIds.length === 0}
                                            className="flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-500/30 active:scale-95 group"
                                        >
                                            {isSynthesizing ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Synthesizing Narrative...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap size={14} className="group-hover:animate-bounce" />
                                                    Generate Variants
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content View */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-16">
                                {sequence.filter(n => selectedNodeIds.includes(n.id) || n.id === activeNodeId).map((node) => {
                                    const events = getVisibleEvents(node.id);
                                    const isTarget = selectedNodeIds.includes(node.id);

                                    return (
                                        <div key={node.id} className={`space-y-6 animate-in slide-in-from-bottom-4 duration-700 transition-opacity ${activeVariantId !== 'original' && !isTarget ? 'opacity-30' : 'opacity-100'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isTarget ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                    {isTarget ? "Target: Neural Batch" : "Context Window"}
                                                </div>
                                                <h3 className="text-lg font-bold text-white opacity-80">{node.data.title}</h3>
                                            </div>

                                            <div className="grid gap-4 pl-6 relative">
                                                {events.length === 0 ? (
                                                    <div className="p-10 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-4 text-slate-600 italic">
                                                        <Box size={32} strokeWidth={1} className="text-slate-800" />
                                                        <span className="text-xs font-bold">No Events in this Node</span>
                                                    </div>
                                                ) : (
                                                    events.map((event, eventIdx) => {
                                                        const char = characters.find(c => c.id === event.characterId);
                                                        return (
                                                            <div key={event.id} className="group flex gap-6 p-6 bg-slate-900/40 hover:bg-slate-900/60 rounded-[28px] border border-slate-800/50 transition-all hover:border-slate-700 hover:shadow-xl">
                                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700 overflow-hidden">
                                                                    {char ? (
                                                                        <img
                                                                            src={`${(import.meta as any).env.VITE_API_URL || 'http://localhost:8000'}/Character/${char.name}/Default.png`}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Zap size={14} className="text-slate-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{char?.name || "Narration"}</span>
                                                                        <span className="text-[9px] text-slate-700 font-bold">Event {eventIdx + 1}</span>
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-300 leading-relaxed">{event.text}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                                <div className="absolute left-[-2px] top-6 bottom-6 w-0.5 bg-slate-800 rounded-full" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col items-center py-12 opacity-20">
                                <div className="w-10 h-10 border-2 border-slate-700 rounded-full flex items-center justify-center mb-4">
                                    <BrainCircuit size={20} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">End of Synthesis Context</p>
                            </div>
                        </div>
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
