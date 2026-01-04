import React, { useRef, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Character, NodeData, SceneEvent, EventType } from '../types';
import { resolveImageUrl } from './GamePreview';
import { X, Check, Search, Plus, Trash2 } from 'lucide-react';

interface SceneEditorProps {
    data: NodeData; // The scene node data
    characters: Character[];
    onUpdateEvent: (eventId: string, updates: Partial<SceneEvent>) => void;
    onClose: () => void;
}

interface DraggableCharacterLargeProps {
    event: SceneEvent;
    imgSrc: string;
    onUpdate: (id: string, updates: Partial<SceneEvent>) => void;
}

const DraggableCharacterLarge: React.FC<DraggableCharacterLargeProps> = ({
    event,
    imgSrc,
    onUpdate
}) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const initialX = event.x ?? 50;
    const initialY = event.y ?? 100;

    return (
        <Draggable
            nodeRef={nodeRef}
            axis="both"
            // bounds="parent" - Removed to allow dragging off-stage or to exact edges without constraint issues
            position={{ x: 0, y: 0 }}
            onStop={(e, d) => {
                if (!nodeRef.current || !nodeRef.current.parentElement) return;
                const parent = nodeRef.current.parentElement;
                const width = parent.offsetWidth;
                const height = parent.offsetHeight;

                // New absolute pixel position matches the drag result
                const currentXpx = (initialX / 100 * width) + d.x;
                const currentYpx = (initialY / 100 * height) + d.y;

                const newX = Math.round((currentXpx / width) * 100);
                const newY = Math.round((currentYpx / height) * 100);

                onUpdate(event.id, { x: newX, y: newY });
            }}
        >
            <div
                ref={nodeRef}
                className="absolute w-64 cursor-move transition-transform active:scale-105 hover:z-10 group" // Larger width (w-64) for big screen
                style={{
                    left: `${initialX}%`,
                    top: `${initialY}%`,
                }}
            >
                <div
                    className="w-full relative"
                    style={{
                        transform: `translate(-50%, -100%) scale(${event.scale || 1}) scaleX(${event.flip ? -1 : 1})`,
                    }}
                >
                    <img
                        src={imgSrc}
                        alt="char"
                        className="w-full h-auto drop-shadow-2xl pointer-events-none select-none"
                    />

                    {/* Hover Info */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                        x: {initialX}% y: {initialY}%
                    </div>
                </div>
            </div>
        </Draggable>
    );
};

export const SceneEditor: React.FC<SceneEditorProps> = ({ data, characters, onUpdateEvent, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const charEvents = useMemo(() =>
        (data.events || []).filter(e => e.type === EventType.CHAR_ENTER && e.visible !== false),
        [data.events]);

    const getCharImage = (charId?: string, imageId?: string) => {
        if (!characters) return null;
        const char = characters.find(c => c.id === charId);
        if (!char) return null;
        return char.images.find(img => img.id === imageId)?.url;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">
                    <h2 className="text-2xl font-black text-white tracking-tight">{data.title}</h2>
                    <p className="text-slate-400 text-sm">Visual Scene Editor</p>
                </div>
                <button onClick={onClose} className="pointer-events-auto bg-white text-black p-3 rounded-full hover:bg-slate-200 transition-colors shadow-xl">
                    <Check size={24} />
                </button>
            </div>

            {/* Stage */}
            <div
                className="w-[90%] aspect-video bg-black relative shadow-2xl rounded-2xl overflow-hidden border border-slate-800"
                style={{
                    backgroundImage: `url(${resolveImageUrl(data.backgroundImage)})`,
                    backgroundSize: data.backgroundScaling === 'FIXED' ? 'contain' : 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div ref={containerRef} className="absolute inset-0">
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-10 border-2 border-dashed border-white/50 m-8 rounded-xl" />

                    {charEvents.map(event => {
                        const imgSrc = resolveImageUrl(getCharImage(event.characterId, event.characterImageId));
                        if (!imgSrc) return null;

                        return (
                            <DraggableCharacterLarge
                                key={event.id}
                                event={event}
                                imgSrc={imgSrc}
                                onUpdate={(id, updates) => onUpdateEvent(id, updates)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Footer Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-2xl p-2 flex gap-2 shadow-2xl">
                <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                    Editor Mode
                </div>
            </div>
        </div>
    );
};
