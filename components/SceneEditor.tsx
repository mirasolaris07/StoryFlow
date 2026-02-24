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
    const initialScale = event.scale || 1;

    // Local state for temporary drag feedback if needed, but we'll stick to direct updates for simplicity
    const handleResize = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startScale = initialScale;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            // Adjust scale based on horizontal movement (right = bigger)
            const newScale = Math.max(0.1, Math.min(5, startScale + (deltaX / 200)));
            onUpdate(event.id, { scale: Math.round(newScale * 100) / 100 });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            axis="both"
            position={{ x: 0, y: 0 }}
            onStop={(e, d) => {
                if (!nodeRef.current || !nodeRef.current.parentElement) return;
                const parent = nodeRef.current.parentElement;
                const width = parent.offsetWidth;
                const height = parent.offsetHeight;

                const currentXpx = (initialX / 100 * width) + d.x;
                const currentYpx = (initialY / 100 * height) + d.y;

                const newX = Math.round((currentXpx / width) * 1000) / 10;
                const newY = Math.round((currentYpx / height) * 1000) / 10;

                onUpdate(event.id, { x: newX, y: newY });
            }}
        >
            <div
                ref={nodeRef}
                className="absolute cursor-move active:scale-[1.02] hover:z-20 group"
                style={{
                    left: `${initialX}%`,
                    top: `${initialY}%`,
                    width: '30%', // Base width of the character container
                    zIndex: event.visible === false ? 0 : 10
                }}
            >
                <div
                    className="w-full relative origin-bottom"
                    style={{
                        transform: `translate(-50%, -100%) scale(${initialScale}) scaleX(${event.flip ? -1 : 1})`,
                    }}
                >
                    <img
                        src={imgSrc}
                        alt="char"
                        className="w-full h-auto drop-shadow-2xl pointer-events-none select-none transition-shadow group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    />

                    {/* Resize Handle (Bottom-Right) */}
                    <div
                        onMouseDown={handleResize}
                        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full border-4 border-slate-900 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-xl z-30"
                        title="Drag to resize"
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>

                    {/* Hover Info & Controls */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all border border-white/10 flex items-center gap-3 shadow-2xl">
                        <span className="font-black text-blue-400">POS:</span> {initialX}% , {initialY}%
                        <span className="w-px h-3 bg-white/20" />
                        <span className="font-black text-amber-400">SCALE:</span> {Math.round(initialScale * 100)}%
                    </div>

                    {/* Selection Border */}
                    <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
