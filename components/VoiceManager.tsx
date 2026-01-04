import React, { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { Character, SceneEvent, EventType, NodeData } from '../types';
import { synthesizeVoice } from '../services/geminiService';
import { uploadAsset } from '../services/api';
import { Play, Mic, CheckCircle, AlertCircle, Loader2, X, RefreshCw, Filter, Music, Upload, Square, Circle, Trash2 } from 'lucide-react';

interface VoiceManagerProps {
    nodes: Node[];
    characters: Character[];
    narratorVoice: string;
    onUpdateNarratorVoice: (voice: string) => void;
    onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
    onUpdateNode: (id: string, data: Partial<NodeData>) => void;
    onClose: () => void;
}

interface VoiceLine {
    nodeId: string;
    nodeTitle: string;
    eventId: string;
    text: string;
    characterName: string;
    voiceId: string;
    status: 'missing' | 'generated' | 'processing' | 'error';
    url?: string;
}

export const VoiceManager: React.FC<VoiceManagerProps> = ({ nodes, characters, narratorVoice, onUpdateNarratorVoice, onUpdateCharacter, onUpdateNode, onClose }) => {
    const [lines, setLines] = useState<VoiceLine[]>([]);
    const [filter, setFilter] = useState<'all' | 'missing' | 'generated'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [recordingLineId, setRecordingLineId] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Helper to decode audio data, trying standard decoding first, then raw PCM fallback
    const decodeAudioData = async (data: Uint8Array, context: AudioContext, targetSampleRate: number = 24000, channels: number = 1): Promise<AudioBuffer> => {
        try {
            // Must slice to get a fresh ArrayBuffer for decodeAudioData
            const arrayBuffer = (data.buffer as any).slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
            return await context.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn("Standard decode failed, falling back to raw PCM interpretation", e);
            // Raw PCM interpretation (Assuming 16-bit Little Endian)
            const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
            const frameCount = Math.floor(dataInt16.length / channels);
            const buffer = context.createBuffer(channels, frameCount, targetSampleRate);

            for (let channel = 0; channel < channels; channel++) {
                const channelData = buffer.getChannelData(channel);
                for (let i = 0; i < frameCount; i++) {
                    channelData[i] = dataInt16[i * channels + channel] / 32768.0;
                }
            }
            return buffer;
        }
    };

    useEffect(() => {
        scanNodes();
    }, [nodes, characters]);

    const scanNodes = () => {
        const allLines: VoiceLine[] = [];
        nodes.forEach(node => {
            const data = node.data as NodeData;


            if (!data.events) return;

            data.events.forEach(event => {
                if (event.type === EventType.DIALOGUE || event.type === EventType.NARRATION) {
                    const char = characters.find(c => c.id === event.characterId);
                    const voiceId = event.type === EventType.NARRATION ? narratorVoice : (char?.voiceId || 'None');

                    if (voiceId === 'None') return;

                    allLines.push({
                        nodeId: node.id,
                        nodeTitle: data.title || 'Untitled Node',
                        eventId: event.id,
                        text: event.text || '',
                        characterName: event.type === EventType.NARRATION ? 'Narrator' : (char?.name || 'Unknown'),
                        voiceId,
                        status: event.voiceAssetId ? 'generated' : 'missing',
                        url: event.voiceAssetId
                    });
                }
            });
        });
        setLines(allLines);
    };

    const generateVoiceForLine = async (line: VoiceLine) => {
        try {
            // 1. Synthesize
            const base64Audio = await synthesizeVoice(line.text, line.voiceId);

            // 2. Convert to Blob
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/mp3' });

            // 3. Create File
            const filename = `voice_${line.nodeId}_${line.eventId}.mp3`;
            const file = new File([blob], filename, { type: 'audio/mp3' });

            // 4. Upload
            const path = 'audio/voices';
            const url = await uploadAsset(file, path);

            // 5. Update Node
            const node = nodes.find(n => n.id === line.nodeId);
            if (node) {
                const data = node.data as NodeData;
                const newEvents = data.events.map(e =>
                    e.id === line.eventId ? { ...e, voiceAssetId: url } : e
                );
                onUpdateNode(node.id, { events: newEvents });
            }

            return url;
        } catch (error) {
            console.error("Voice Generation Error:", error);
            throw error;
        }
    };

    const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>, line: VoiceLine) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'processing' } : l));
            const path = 'audio/voices';
            const url = await uploadAsset(file, path);

            // Update Node
            const node = nodes.find(n => n.id === line.nodeId);
            if (node) {
                const data = node.data as NodeData;
                const newEvents = data.events.map(ev =>
                    ev.id === line.eventId ? { ...ev, voiceAssetId: url } : ev
                );
                onUpdateNode(node.id, { events: newEvents });
            }

            setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'generated', url } : l));
        } catch (error) {
            setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'error' } : l));
        } finally {
            e.target.value = '';
        }
    };

    const startRecording = async (line: VoiceLine) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' }); // Browsers usually record webm
                const file = new File([blob], `voice_${line.nodeId}_${line.eventId}.webm`, { type: 'audio/webm' });

                try {
                    setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'processing' } : l));
                    const path = 'audio/voices';
                    const url = await uploadAsset(file, path);

                    // Update Node
                    const node = nodes.find(n => n.id === line.nodeId);
                    if (node) {
                        const data = node.data as NodeData;
                        const newEvents = data.events.map(ev =>
                            ev.id === line.eventId ? { ...ev, voiceAssetId: url } : ev
                        );
                        onUpdateNode(node.id, { events: newEvents });
                    }
                    setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'generated', url } : l));
                } catch (e) {
                    setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'error' } : l));
                }
                setRecordingLineId(null);
                setMediaRecorder(null);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setRecordingLineId(line.eventId);
        } catch (err) {
            console.error("Recording failed:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    };

    const playPreview = async (url: string) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        if (currentSourceRef.current) {
            currentSourceRef.current.stop();
        }

        try {
            const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
            const resolvedUrl = url.startsWith('http') ? url : `${API_URL}/${url.startsWith('/') ? url.slice(1) : url}`;

            console.log("Attempting to play preview from:", resolvedUrl);
            const response = await fetch(resolvedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const audioData = new Uint8Array(arrayBuffer);
            const audioBuffer = await decodeAudioData(audioData, ctx);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
            currentSourceRef.current = source;
        } catch (e) {
            console.error("Playback failed (Robust):", e);
            alert(`Playback failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const batchGenerate = async () => {
        const targets = lines.filter(l =>
            (filter === 'all' || (filter === 'missing' && l.status === 'missing')) &&
            l.status !== 'processing'
        );

        if (targets.length === 0) return;

        setIsProcessing(true);
        let completed = 0;

        for (const line of targets) {
            try {
                setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'processing' } : l));
                const url = await generateVoiceForLine(line);
                setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'generated', url } : l));
            } catch (e) {
                setLines(prev => prev.map(l => l.eventId === line.eventId ? { ...l, status: 'error' } : l));
            }
            completed++;
            setProgress(Math.round((completed / targets.length) * 100));
        }

        setIsProcessing(false);
        setProgress(0);
    };

    const filteredLines = lines.filter(l => {
        if (filter === 'missing') return l.status === 'missing' || l.status === 'error';
        if (filter === 'generated') return l.status === 'generated';
        return true;
    });

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10 animate-in fade-in duration-300">
            <div className="w-full max-w-6xl h-4/5 bg-slate-900 border border-slate-700 rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <Mic className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Voice Manager</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{lines.length} Total Lines Found</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Narrator Voice</div>
                            <select
                                value={narratorVoice}
                                onChange={(e) => onUpdateNarratorVoice(e.target.value)}
                                className="bg-slate-900 text-xs text-white border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Fenrir">Fenrir (Default)</option>
                                <option value="Aoede">Aoede</option>
                                <option value="Kore">Kore</option>
                                <option value="Puck">Puck</option>
                                <option value="Charon">Charon</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
                            {(['all', 'missing', 'generated'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="px-8 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <CheckCircle size={14} className="text-emerald-500" /> {lines.filter(l => l.status === 'generated').length} Ready
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <AlertCircle size={14} className="text-amber-500" /> {lines.filter(l => l.status === 'missing').length} Missing
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto max-w-xl no-scrollbar px-2">
                            {characters.map(char => (
                                <div key={char.id} className="flex flex-col gap-1 min-w-[120px]">
                                    <div className="text-[8px] font-black text-slate-500 uppercase truncate">{char.name}</div>
                                    <select
                                        value={char.voiceId || 'None'}
                                        onChange={(e) => onUpdateCharacter(char.id, { voiceId: e.target.value })}
                                        className="bg-slate-900 text-[10px] text-white border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
                                    >
                                        <option value="None">None</option>
                                        <option value="Fenrir">Fenrir</option>
                                        <option value="Aoede">Aoede</option>
                                        <option value="Kore">Kore</option>
                                        <option value="Puck">Puck</option>
                                        <option value="Charon">Charon</option>
                                    </select>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={batchGenerate}
                            disabled={isProcessing || filteredLines.length === 0}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-20 disabled:grayscale"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {isProcessing ? `Generating... ${progress}%` : `Generate ${filteredLines.filter(l => l.status === 'missing').length} Voices`}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid gap-4">
                        {filteredLines.map(line => (
                            <div key={`${line.nodeId}-${line.eventId}`} className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-6 transition-all flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-8">
                                        <div className="w-24">
                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">Node</div>
                                            <div className="text-[11px] font-bold text-slate-300 truncate w-full">{line.nodeTitle}</div>
                                        </div>

                                        <div className="w-32">
                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">Speaker</div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-900/50" />
                                                <span className="text-[11px] font-black text-white">{line.characterName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            {line.status === 'generated' && (
                                                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-900/20 animate-in fade-in zoom-in duration-300">
                                                    <CheckCircle size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ready</span>
                                                </div>
                                            )}
                                            {line.status === 'missing' && (
                                                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-xl border border-amber-500/20 shadow-lg shadow-amber-900/20">
                                                    <AlertCircle size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Missing</span>
                                                </div>
                                            )}
                                            {line.status === 'processing' && (
                                                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-900/20">
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Synthesizing</span>
                                                </div>
                                            )}
                                            {line.status === 'error' && (
                                                <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-xl border border-rose-500/20 shadow-lg shadow-rose-900/20">
                                                    <AlertCircle size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Error</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-6 w-px bg-slate-700/50 mx-2" />

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => generateVoiceForLine(line)}
                                                title="Generate AI Voice"
                                                className="p-3 bg-slate-900 hover:bg-blue-600 text-slate-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                                            >
                                                <RefreshCw size={16} />
                                            </button>

                                            <button
                                                onClick={() => recordingLineId === line.eventId ? stopRecording() : startRecording(line)}
                                                title={recordingLineId === line.eventId ? "Stop Recording" : "Record Voice"}
                                                className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${recordingLineId === line.eventId ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-900' : 'bg-slate-900 hover:bg-rose-600 text-slate-500 hover:text-white'}`}
                                            >
                                                {recordingLineId === line.eventId ? <Square size={16} /> : <Circle size={16} />}
                                            </button>

                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="audio/*"
                                                    className="hidden"
                                                    id={`upload-${line.eventId}`}
                                                    onChange={(e) => handleManualUpload(e, line)}
                                                />
                                                <label
                                                    htmlFor={`upload-${line.eventId}`}
                                                    title="Upload Voice File"
                                                    className="p-3 bg-slate-900 hover:bg-emerald-600 text-slate-500 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg active:scale-95"
                                                >
                                                    <Upload size={16} />
                                                </label>
                                            </div>

                                            {line.url && (
                                                <button
                                                    onClick={() => playPreview(line.url!)}
                                                    title="Play Preview"
                                                    className="p-3 bg-slate-900 hover:bg-amber-600 text-slate-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                                                >
                                                    <Play size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pl-0 pb-1 border-l-4 border-slate-700/50 ml-0 pl-4 py-1">
                                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 opacity-50">Dialogue Text</div>
                                    <p className="text-sm text-slate-400 font-medium italic opacity-80 leading-relaxed max-w-4xl">"{line.text}"</p>
                                </div>
                            </div>
                        ))}
                        {filteredLines.length === 0 && (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                                <Filter size={48} className="mb-4 opacity-20" />
                                <p className="text-sm uppercase tracking-widest font-black">No lines match the filter</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
