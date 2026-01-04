
import React, { useState, useLayoutEffect, useRef } from 'react';

export const usePaginatedText = (
    text: string,
    containerHeight: number,
    containerWidth: number,
    style: React.CSSProperties
) => {
    const [pages, setPages] = useState<string[]>([]);
    const measureRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!measureRef.current || !text || containerHeight <= 0) return;

        const words = text.split(' ');
        const calculatedPages: string[] = [];
        let currentWords: string[] = [];

        // Setup ghost element style to match actual display
        const ghost = measureRef.current;
        Object.assign(ghost.style, style);
        ghost.style.width = `${containerWidth}px`;
        ghost.style.position = 'absolute';
        ghost.style.visibility = 'hidden';
        ghost.style.whiteSpace = 'pre-wrap'; // Important for accurate wrapping

        // Greedy algorithm for word fitting
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            currentWords.push(word);
            ghost.innerText = currentWords.join(' ');

            // Check overflow
            if (ghost.scrollHeight > containerHeight) {
                currentWords.pop(); // Remove overflowing word
                if (currentWords.length > 0) {
                    calculatedPages.push(currentWords.join(' '));
                }
                currentWords = [word]; // Start new page with that word
            }
        }

        if (currentWords.length > 0) {
            calculatedPages.push(currentWords.join(' '));
        }

        // Fallback if something went wrong or no text
        if (calculatedPages.length === 0) calculatedPages.push(text);

        setPages(calculatedPages);
    }, [text, containerHeight, containerWidth, JSON.stringify(style)]);

    return { pages, measureRef };
};
