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
            // bounds="parent" - Removed to allow full freedom
            position={{ x: 0, y: 0 }} // Controlled by CSS left/top mostly, but we need to reset Draggable's internal tracking on stop
            onStop={(e, d) => {
                // We need to calculate the % based on the parent
                if (!nodeRef.current || !nodeRef.current.parentElement) return;
                const parent = nodeRef.current.parentElement;
                const width = parent.offsetWidth;
                const height = parent.offsetHeight;

                // New absolute pixel position matches the drag result
                // But wait, Draggable uses translate.
                // We want to update the LEFT/TOP % props.

                // Our 'left' is initialX%. Draggable adds 'd.x' (pixels).
                // Final X (px) = (initialX% * width) + d.x
                const currentXpx = (initialX / 100 * width) + d.x;
                const currentYpx = (initialY / 100 * height) + d.y;

                const newX = Math.round((currentXpx / width) * 100);
                const newY = Math.round((currentYpx / height) * 100);

                onUpdate(event.id, { x: newX, y: newY });
            }}
        >
            <div
                ref={nodeRef}
                className="absolute w-48 cursor-move transition-transform active:scale-105 hover:z-10"
                style={{
                    left: `${initialX}%`,
                    top: `${initialY}%`,
                    // We apply the anchor transform here. Draggable will append its own translate() to this style prop.
                }}
            >
                <div
                    className="w-full relative"
                    style={{
                        // Apply the anchor transform inner, so Draggable moves the 'origin' point
                        transform: `translate(-50%, -100%) scale(${event.scale || 1}) scaleX(${event.flip ? -1 : 1})`,
                    }}
                >
                    <img
                        src={imgSrc}
                        alt="char"
                        className="w-full h-auto drop-shadow-2xl pointer-events-none"
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[9px] px-2 py-0.5 rounded opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none">
                        x: {initialX}% y: {initialY}%
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
            className="w-full aspect-video bg-black relative overflow-hidden rounded-lg border border-slate-700 select-none group"
            style={{
                backgroundImage: `url(${resolveImageUrl(data.backgroundImage)})`,
                backgroundSize: data.backgroundScaling === 'FIXED' ? 'contain' : 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 pointer-events-none opacity-20 border-2 border-dashed border-white/50 m-4 rounded group-hover:opacity-40 transition-opacity" />

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
