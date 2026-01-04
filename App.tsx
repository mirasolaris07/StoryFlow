
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowInstance
} from 'reactflow';

import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { SceneEditor } from './components/SceneEditor';
import { DialogueStyler } from './components/DialogueStyler';
import { CharacterManager } from './components/CharacterManager';
import { AttributeManager } from './components/AttributeManager';
import { AudioManager } from './components/AudioManager';
import { StartNode, SceneNode, LogicNode, EndNode, SetterNode, MenuNode } from './components/NodeTypes';
import { SuperNode } from './components/SuperNode';
import { GamePreview } from './components/GamePreview';
import { VoiceManager } from './components/VoiceManager';
import { INITIAL_CHARACTERS } from './constants';
import { NodeType, NodeData, Character, AudioAsset, Attribute, EventType, ProjectRecord, DialogueBoxStyle } from './types';
import { Play, Save, MessageSquare, Download, Upload, Trash2, FolderOpen, RefreshCw, Palette, Folder, Mic, Edit3 } from 'lucide-react';

const nodeTypes = {
  START: StartNode,
  SCENE: SceneNode,
  LOGIC: LogicNode,
  SETTER: SetterNode,
  MENU: MenuNode,
  END: EndNode,
  SUPER: SuperNode,
};

const STORAGE_KEY = 'adventure_forge_project_record';

export default function App() {
  const [projectName, setProjectName] = useState('AdventureForge Project');
  const [activeTab, setActiveTab] = useState('scenes');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStartNodeId, setPreviewStartNodeId] = useState<string | null>(null);
  const [isSceneEditorOpen, setIsSceneEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [gameAttributes, setGameAttributes] = useState<Attribute[]>([]);
  const [dialogueStyle, setDialogueStyle] = useState<DialogueBoxStyle>({
    boxColor: '#000000',
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    opacity: 0.8,
    yPosition: 5,
    width: 90,
    xPosition: 50,
    height: 30
  });
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState('Fenrir');

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save Project Record
  const saveProject = useCallback(() => {
    const record: ProjectRecord = {
      projectName,
      nodes,
      edges,
      characters,
      audioAssets,
      gameAttributes,
      dialogueStyle,
      narratorVoice,
      version: '1.0',
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  }, [nodes, edges, characters, audioAssets, gameAttributes, dialogueStyle, narratorVoice]);

  // Load Project Record
  const loadProject = useCallback((record: ProjectRecord) => {
    try {
      if (record.projectName) setProjectName(record.projectName);
      if (record.nodes) setNodes(record.nodes);
      if (record.edges) setEdges(record.edges);
      if (record.characters) setCharacters(record.characters);
      if (record.audioAssets) setAudioAssets(record.audioAssets);
      if (record.gameAttributes) setGameAttributes(record.gameAttributes);
      if (record.dialogueStyle) setDialogueStyle(record.dialogueStyle);
      if (record.narratorVoice) setNarratorVoice(record.narratorVoice);
    } catch (e) {
      console.error("Failed to load project", e);
    }
  }, [setNodes, setEdges, setCharacters, setAudioAssets, setGameAttributes, setDialogueStyle, setNarratorVoice]);

  // Player Mode Auto-Load
  useEffect(() => {
    const isPlayer = (import.meta as any).env.VITE_APP_MODE === 'player';
    if (isPlayer) {
      console.log("Running in PLAYER mode");
      fetch('./data.json')
        .then(res => res.json())
        .then(data => {
          loadProject(data);
          setShowPreview(true);
        })
        .catch(err => {
          console.error("Failed to load embedded story data:", err);
          alert("Error: No story data found. Please export from editor first.");
        });
    }
  }, [loadProject]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        loadProject(JSON.parse(saved));
      } catch (e) {
        console.error("Local record corrupted");
      }
    } else {
      // Load Compiled Story JSON
      fetch('/game/build/story.json')
        .then(res => {
          if (!res.ok) throw new Error("No built story found");
          return res.json();
        })
        .then(storyData => {
          console.log("Loaded story.json", storyData);
          loadProject(storyData as ProjectRecord);
        })
        .catch(err => {
          console.warn("Failed to load story.json, falling back to empty", err);
          setNodes([
            { id: 'start', type: 'START', position: { x: 0, y: 0 }, data: { title: 'Adventure Start' } },
            { id: 'intro', type: 'SCENE', position: { x: 250, y: 0 }, data: { title: 'The Lake', backgroundImage: 'Scene/lake.png', events: [] } }
          ]);
          setEdges([{ id: 'e-start-intro', source: 'start', target: 'intro', animated: true }]);
        });
    }
  }, [loadProject, setNodes, setEdges]);

  // Auto-save on every change to nodes, edges, or assets
  useEffect(() => {
    const timer = setTimeout(() => saveProject(), 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, characters, audioAssets, gameAttributes, dialogueStyle, narratorVoice, saveProject]);

  // Auto-scroll logs
  useEffect(() => {
    if (buildLogs.length > 0) {
      const el = document.getElementById('logs-end');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildLogs]);

  const handleManualSave = () => {
    setIsSaving(true);
    saveProject();
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleBuild = useCallback(async () => {
    console.log("Build started, requesting save path...");
    setBuildLogs(["[SYSTEM] Requesting save location..."]);

    const record = saveProject();

    try {
      const res = await fetch('http://localhost:8000/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, projectName })
      });

      if (!res.ok) {
        const err = await res.json();
        setBuildLogs(prev => [...prev, `ERR: ${err.detail || 'Unknown server error'}`]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      setIsBuilding(true);
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Save incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('STATUS: COMPLETE|')) {
            const path = line.split('|')[1];
            alert(`Build Complete!\nSaved to: ${path}`);
          }

          setBuildLogs(prev => [...prev, line]);
        }
      }
    } catch (e) {
      console.error("Build request failed:", e);
      setBuildLogs(prev => [...prev, `ERR: Connection Failed. Is the server running?`]);
    } finally {
      setIsBuilding(false);
    }
  }, [saveProject, projectName]);

  const handleExport = (format: 'json' | 'yaml' | 'storyline' | 'storyline_yaml' | 'storyline_md' = 'json') => {
    try {
      if (format === 'storyline' || format === 'storyline_yaml' || format === 'storyline_md') {
        // Use the new exporter utility
        // Dynamic import or direct usage if we import it at top
        import('./utils/storylineExporter').then(({ generateStoryline }) => {
          // Collect all attributes for resolution
          // We have gameAttributes in state. And characters have attributes.
          const allAttributes = [...gameAttributes];
          characters.forEach(c => allAttributes.push(...(c.attributes || [])));

          const targetFormat = format === 'storyline_md' ? 'markdown' : 'yaml';
          const ext = targetFormat === 'markdown' ? 'md' : 'yaml';
          const mime = targetFormat === 'markdown' ? 'text/markdown' : 'text/yaml';

          const content = generateStoryline(nodes, edges, characters, audioAssets, allAttributes, targetFormat);
          downloadFile(content, `story-script-${Date.now()}.${ext}`, mime);
        }).catch(err => {
          console.error("Exporter failed:", err);
          alert("Export failed! " + err.message);
        });
        return;
      }

      const record = saveProject();
      let content = "";
      let mimeType = "application/json";
      let ext = "json";

      if (format === 'yaml') {
        import('yaml').then(({ stringify }) => {
          content = stringify(record);
          downloadFile(content, `adventure-project-${Date.now()}.yaml`, 'text/yaml');
        }).catch(err => {
          console.error("YAML Export failed:", err);
          alert("YAML Export failed: " + err.message);
        });
      } else {
        content = JSON.stringify(record, null, 2);
        downloadFile(content, `adventure-project-${Date.now()}.json`, 'application/json');
      }

      console.log("Export triggered successfully");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed! Check console.");
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProject(json); // Removed the alert and return value check
        alert("Project Record Imported!");
      } catch (err) {
        alert("Invalid record file format.");
      }
    };
    reader.readAsText(file);
  };

  const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
  }, [setNodes]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const addNodeAtPos = useCallback((type: NodeType, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position,
      data: { title: `New ${type}`, events: [], choices: [] },
    };
    setNodes((nds) => [...nds, newNode]);
    setMenu(null);
  }, [setNodes]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowInstance) return;
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNodeAtPos(type, position);
  }, [reactFlowInstance, addNodeAtPos]);

  // --- Super Node Logic ---

  const toggleBranchVisibility = useCallback((rootId: string, shouldBeVisible: boolean, currentNodes: Node[], currentEdges: Edge[]) => {
    const newNodes = [...currentNodes];
    const newEdges = [...currentEdges];
    const queue = [rootId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (visited.has(currId)) continue;
      visited.add(currId);

      // Find outgoing edges from this node
      // Explicitly check for edges where source == currId
      const outgoingEdges = newEdges.filter(e => e.source === currId);

      outgoingEdges.forEach(edge => {
        // 1. Toggle Edge
        // We mutate the object in the array (or replace it)
        const edgeIndex = newEdges.findIndex(e => e.id === edge.id);
        if (edgeIndex !== -1) {
          newEdges[edgeIndex] = { ...newEdges[edgeIndex], hidden: !shouldBeVisible };
        }

        // 2. Toggle Target Node
        const targetNode = newNodes.find(n => n.id === edge.target);
        if (!targetNode) return;

        // If we are showing nodes, we must respect nested collapsed Super Nodes.
        // If target is a Super Node that is collapsed, we SHOW the node itself, 
        // but we DO NOT traverse into its children.
        const isCollapsedSuper = targetNode.type === 'SUPER' && !targetNode.data.isExpanded;

        // Always toggle the visibility of the immediate target
        const nodeIndex = newNodes.findIndex(n => n.id === targetNode.id);
        if (nodeIndex !== -1) {
          newNodes[nodeIndex] = { ...newNodes[nodeIndex], hidden: !shouldBeVisible };
        }

        // Decide if we continue traversal
        if (shouldBeVisible && isCollapsedSuper) {
          // Stop here for this branch
        } else {
          queue.push(targetNode.id);
        }
      });
    }
    return { nodes: newNodes, edges: newEdges };
  }, []);

  const handleToggleSuperNode = useCallback((nodeId: string) => {
    setNodes((prevNodes) => {
      const node = prevNodes.find(n => n.id === nodeId);
      if (!node) return prevNodes;

      const isExpanded = !!node.data.isExpanded;
      const newExpandedState = !isExpanded;

      // Update the clicked node's state
      const updatedNodes = prevNodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, isExpanded: newExpandedState } } : n
      );

      // Update visibility of children
      // We need edges state here. Accessing state inside setter is tricky if we need both.
      // Better to do this outside or use a ref for edges if stable.
      // Actually, we can just use the 'edges' from the component scope if we trust it's recent enough,
      // but inside setNodes it might be stale if we batched updates. 
      // However, for a click handler, 'edges' dependency is fine.

      return updatedNodes;
    });

    // We need to perform the visibility toggle calculation.
    // We'll do a second state update for the graph structure changes.
    // This is slightly inefficient but safe.
    setNodes(currentNodes => {
      const targetNode = currentNodes.find(n => n.id === nodeId);
      if (!targetNode) return currentNodes;

      // We are toggling TO this state
      const willBeExpanded = !targetNode.data.isExpanded;

      // 1. Update the Super Node itself
      const nodesWithSuperUpdated = currentNodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, isExpanded: willBeExpanded } } : n
      );

      // 2. Calculate Visibility
      // We pass the edges from the outer scope
      const result = toggleBranchVisibility(nodeId, willBeExpanded, nodesWithSuperUpdated, edges);

      // We also need to update edges
      setEdges(result.edges);

      return result.nodes;
    });
  }, [edges, toggleBranchVisibility, setEdges, setNodes]);

  // Player Mode Logic
  const isPlayerMode = (import.meta as any).env.VITE_APP_MODE === 'player';

  useEffect(() => {
    if (isPlayerMode) {
      setShowPreview(true);
    }
  }, [isPlayerMode]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  if (isPlayerMode && showPreview) {
    return (
      <div className="w-screen h-screen bg-black overflow-hidden relative">
        <GamePreview
          nodes={nodes}
          edges={edges}
          characters={characters}
          audioAssets={audioAssets}
          gameAttributes={gameAttributes}
          dialogueStyle={dialogueStyle}
          initialNodeId={previewStartNodeId}
          narratorVoice={narratorVoice}
          onClose={() => {
            // In standalone player, "close" might mean exit or return to menu
            if ((window as any).electron) {
              (window as any).electron.invoke('quit-app');
            }
          }}
        />
      </div>
    );
  }

  // --- Logic Node Collapsing ---
  const handleToggleLogicCollapse = (nodeId: string) => {
    // 1. Toggle the Logic Node state
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const newCollapsedState = !targetNode.data.isCollapsed;

    // Update the Logic Node itsef
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isCollapsed: newCollapsedState } } : n));

    // 2. Find Subtree
    // We only hide nodes if we are collapsing. If expanding, we verify they should be visible.
    // For simplicity: A node is hidden if ANY of its upstream Logic parents are collapsed? 
    // No, that's complex. simple trigger method:
    // "When Collapsing: Hide all children."
    // "When Expanding: Show all children."

    // Get all downstream nodes/edges
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      // Find outgoing edges
      const outgoing = edges.filter(e => e.source === curr);

      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    // Apply visibility
    // Note: This is an aggressive toggle. It doesn't check if nodes are used elsewhere.
    // For a "Visual Editor", visual clutter reduction often overrides strict topological correctness.
    const nodesToToggle = new Set(visited);

    setNodes(nds => nds.map(n => {
      if (nodesToToggle.has(n.id)) {
        return { ...n, hidden: newCollapsedState };
      }
      return n;
    }));

    setEdges(eds => eds.map(e => {
      // Hide edges connected to hidden nodes OR originating from the logic node itself
      if (nodesToToggle.has(e.target) || e.source === nodeId) {
        return { ...e, hidden: newCollapsedState };
      }
      return e;
    }));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 font-inter">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={handleExport}
        onBuild={handleBuild}
        isBuilding={isBuilding}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        logs={buildLogs}
        onClearLogs={() => setBuildLogs([])}
      />

      <main className="flex-1 relative flex flex-col">
        {/* Hidden File Input for Import */}
        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />

        {activeTab === 'scenes' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative h-full w-full">
              <ReactFlow
                nodes={nodes.map(n => ({
                  ...n,
                  data: {
                    ...n.data,
                    characters,
                    audioAssets,
                    gameAttributes,
                    onToggleExpand: n.type === 'SUPER' ? () => handleToggleSuperNode(n.id) : undefined,
                    onToggleCollapse: n.type === 'LOGIC' ? () => handleToggleLogicCollapse(n.id) : undefined,
                    isCollapsed: n.data.isCollapsed
                  }
                }))}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onEdgesDelete={(deleted) => {
                  setNodes((nds) => nds.map((node) => {
                    if (node.type === 'LOGIC') {
                      const relevantEdges = deleted.filter(e => e.source === node.id);
                      if (relevantEdges.length > 0) {
                        const data = node.data as NodeData;
                        // Filter OUT choices that lost their edge
                        // This strictly enforces "No Edge = No Choice"
                        const newChoices = data.choices.filter(ch =>
                          // Keep choice only if NO deleted edge was connected to its handle
                          // STRICT CHECK: Only remove if the edge explicitly matches the choice ID.
                          // We removed the catch-all for null handles to prevent accidental wipes.
                          !relevantEdges.some(e => e.sourceHandle === ch.id)
                        );
                        return { ...node, data: { ...node.data, choices: newChoices } };
                      }
                    }
                    return node;
                  }));
                }}
                onConnect={(c) => {
                  let finalConnection = c;

                  // Dynamic Logic Port Creation
                  const sourceNode = nodes.find(n => n.id === c.source);
                  if (sourceNode?.type === 'LOGIC' && c.sourceHandle === 'create-new') {
                    const newChoiceId = `ch-${Date.now()}`;
                    const newChoice = { id: newChoiceId, text: 'New Option', nextNodeId: c.target };

                    // 1. Update Node Data with new Choice
                    setNodes((nds) => nds.map((node) => {
                      if (node.id === c.source) {
                        const data = node.data as NodeData;
                        return { ...node, data: { ...node.data, choices: [...(data.choices || []), newChoice] } };
                      }
                      return node;
                    }));

                    // 2. Redirect Edge to New Handle ID
                    // Note: We accept that for one render cycle the handle might not exist yet visually, 
                    // but ReactFlow usually handles this gracefully if data updates in same batch.
                    finalConnection = { ...c, sourceHandle: newChoiceId };
                  }

                  // Standard Edge Creation
                  setEdges((eds) => addEdge({ ...finalConnection, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds));

                  // Existing Logic Sync (for existing handles)
                  if (sourceNode?.type === 'LOGIC' && c.sourceHandle !== 'create-new') {
                    setNodes((nds) => nds.map((node) => {
                      if (node.id === c.source) {
                        const data = node.data as NodeData;
                        const newChoices = data.choices.map(ch =>
                          ch.id === c.sourceHandle ? { ...ch, nextNodeId: c.target } : ch
                        );
                        return { ...node, data: { ...node.data, choices: newChoices } };
                      }
                      return node;
                    }));
                  }
                }}
                onNodeClick={(_, node) => {
                  console.log("Clicked node:", node.id);
                  setSelectedNodeId(node.id);
                  setMenu(null);
                }}
                onPaneClick={() => { setSelectedNodeId(null); setMenu(null); }}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background color="#1e293b" gap={24} variant={BackgroundVariant.Dots} />
                <Controls />

                <Panel position="top-right">
                  <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-800 shadow-2xl ring-1 ring-white/5">
                    {previewStartNodeId && (
                      <button
                        onClick={() => setShowPreview(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-xs tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/40"
                      >
                        <Play size={16} /> PLAY FROM HERE
                      </button>
                    )}

                    {/* Run Full Story */}
                    <button
                      onClick={() => { setPreviewStartNodeId(null); setShowPreview(true); }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Play size={16} fill="currentColor" /> RUN FULL STORY
                    </button>

                    <div className="w-px h-8 bg-slate-800 mx-1" />
                    <button onClick={() => setShowStyleEditor(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 rounded-xl transition-all border border-slate-700 active:scale-95" title="Dialogue Theme">
                      <Palette size={16} />
                    </button>
                    <button onClick={() => setShowVoiceManager(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 rounded-xl transition-all border border-slate-700 active:scale-95" title="Voice Manager">
                      <Mic size={16} />
                    </button>
                    <button onClick={handleManualSave} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 border border-slate-700 transition-all active:scale-95">
                      <Save size={16} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'SAVING' : 'SAVE'}
                    </button>
                  </div>
                </Panel>

                {menu && (
                  <div className="fixed z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 min-w-[180px] animate-in fade-in zoom-in duration-100" style={{ top: menu.y, left: menu.x }}>
                    <div className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">Quick Add</div>
                    <button onClick={() => addNodeAtPos(NodeType.SCENE, reactFlowInstance!.screenToFlowPosition({ x: menu.x, y: menu.y }))} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg transition-colors">
                      <MessageSquare size={14} className="text-blue-400" /> New Scene
                    </button>
                    <button onClick={() => addNodeAtPos(NodeType.LOGIC, reactFlowInstance!.screenToFlowPosition({ x: menu.x, y: menu.y }))} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-amber-600 hover:text-white rounded-lg transition-colors">
                      <RefreshCw size={14} className="text-amber-400" /> New Logic
                    </button>
                    <button onClick={() => addNodeAtPos(NodeType.SUPER, reactFlowInstance!.screenToFlowPosition({ x: menu.x, y: menu.y }))} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors">
                      <Folder size={14} className="text-indigo-400" /> New Route Group
                    </button>
                  </div>
                )}
              </ReactFlow>
            </div>
            <Inspector
              selectedNode={selectedNode}
              nodes={nodes}
              characters={characters}
              gameAttributes={gameAttributes}
              audioAssets={audioAssets}
              onUpdate={updateNodeData}
              onDeselect={() => setSelectedNodeId(null)}
              onOpenSceneEditor={() => setIsSceneEditorOpen(true)}
            />
          </div>
        ) : activeTab === 'characters' ? (
          <CharacterManager characters={characters} onUpdate={setCharacters} />
        ) : activeTab === 'attributes' ? (
          <AttributeManager attributes={gameAttributes} onUpdate={setGameAttributes} />
        ) : activeTab === 'audio' ? (
          <AudioManager assets={audioAssets} onUpdate={setAudioAssets} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-950">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[40px] p-12 text-center space-y-8 shadow-2xl">
              <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 mx-auto">
                <FolderOpen size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">Project Records</h2>
                <p className="text-sm text-slate-500 leading-relaxed">Manage your story architecture. Records include characters, scenes, variables, and logic flow.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={handleExport} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all border border-slate-700">
                  <Download size={18} /> Export (.json)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-xl shadow-blue-900/20">
                  <Upload size={18} /> Import Record
                </button>
                <button
                  onClick={() => { if (confirm("Reset everything?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }}
                  className="w-full py-4 text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs transition-all"
                >
                  <Trash2 size={16} /> Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showPreview && <GamePreview nodes={nodes} edges={edges} characters={characters} audioAssets={audioAssets} gameAttributes={gameAttributes} dialogueStyle={dialogueStyle} initialNodeId={previewStartNodeId} narratorVoice={narratorVoice} onClose={() => setShowPreview(false)} />}

      {isSceneEditorOpen && selectedNode && (
        <SceneEditor
          data={selectedNode.data as NodeData}
          characters={characters}
          onUpdateEvent={(eventId, updates) => {
            const data = selectedNode.data as NodeData;
            const newEvents = data.events.map(e => e.id === eventId ? { ...e, ...updates } : e);
            updateNodeData(selectedNode.id, { events: newEvents });
          }}
          onClose={() => setIsSceneEditorOpen(false)}
        />
      )}

      {showStyleEditor && (
        <DialogueStyler
          style={dialogueStyle}
          onUpdate={setDialogueStyle}
          onClose={() => setShowStyleEditor(false)}
        />
      )}

      {showVoiceManager && (
        <VoiceManager
          nodes={nodes}
          characters={characters}
          narratorVoice={narratorVoice}
          onUpdateNarratorVoice={setNarratorVoice}
          onUpdateCharacter={updateCharacter}
          onUpdateNode={updateNodeData}
          onClose={() => setShowVoiceManager(false)}
        />
      )}
    </div>
  );
}
