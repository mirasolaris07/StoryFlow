import React, { useRef, useMemo } from 'react';
import { Maximize } from 'lucide-react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Character, NodeData, SceneEvent, EventType } from '../types';
import { resolveImageUrl } from './GamePreview';

interface StagePreviewProps {
    data: NodeData;
    characters: Character[];
    onUpdateEvent: (eventId: string, updates: Partial<SceneEvent>) => void;
    onOpenEditor?: () => void;
}

interface DraggableCharacterProps {
    event: SceneEvent;
    imgSrc: string;
    onUpdate: (id: string, updates: Partial<SceneEvent>) => void;
}

const DraggableCharacter: React.FC<DraggableCharacterProps> = ({
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
            position={{ x: 0, y: 0 }}
            onStop={(e, d) => {
                if (!nodeRef.current || !nodeRef.current.parentElement) return;
                const parent = nodeRef.current.parentElement;
                const width = parent.offsetWidth;
                const height = parent.offsetHeight;

                // Current absolute pixel position
                const currentXpx = (initialX / 100 * width) + d.x;
                const currentYpx = (initialY / 100 * height) + d.y;

                // Precision percentage
                const newX = Math.round((currentXpx / width) * 1000) / 10;
                const newY = Math.round((currentYpx / height) * 1000) / 10;

                onUpdate(event.id, { x: newX, y: newY });
            }}
        >
            <div
                ref={nodeRef}
                className="absolute cursor-move active:scale-[1.02] hover:z-10 group"
                style={{
                    left: `${initialX}%`,
                    top: `${initialY}%`,
                    width: '30%', // Matching Editor/Player
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
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-white/10">
                        {initialX}% , {initialY}%
                    </div>
                </div>
            </div>
        </Draggable>
    );
};

export const StagePreview: React.FC<StagePreviewProps> = ({ data, characters, onUpdateEvent, onOpenEditor }) => {
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
        <div
            ref={containerRef}
            className="w-full aspect-video bg-black relative overflow-hidden rounded-lg border border-slate-700 select-none group flex items-center justify-center"
            style={{
                backgroundImage: `url(${resolveImageUrl(data.backgroundImage)})`,
                backgroundSize: 'cover', // Mini-preview always uses cover for filled look
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 pointer-events-none opacity-10 border-2 border-dashed border-white/50 m-2 rounded group-hover:opacity-30 transition-opacity" />

            {charEvents.map(event => {
                const imgSrc = resolveImageUrl(getCharImage(event.characterId, event.characterImageId));
                if (!imgSrc) return null;

                return (
                    <DraggableCharacter
                        key={event.id}
                        event={event}
                        imgSrc={imgSrc}
                        onUpdate={(id, updates) => onUpdateEvent(id, updates)}
                    />
                );
            })}


            {onOpenEditor && (
                <button
                    onClick={onOpenEditor}
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors shadow-lg z-20 group"
                    title="Open Fullscreen Editor"
                >
                    <Maximize size={14} />
                    <span className="sr-only">Expand</span>
                </button>
            )}
        </div>
    );
};
