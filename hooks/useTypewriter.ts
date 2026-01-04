import { useState, useEffect, useRef, useCallback } from 'react';

export const useTypewriter = (fullText: string, baseSpeed: number = 30, onComplete?: () => void) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const indexRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset when text changes
    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        indexRef.current = 0;
        if (timerRef.current) clearTimeout(timerRef.current);

        const typeChar = () => {
            // Complete
            if (indexRef.current >= fullText.length) {
                setIsTyping(false);
                if (onComplete) onComplete();
                return;
            }

            // Get next char
            const char = fullText.charAt(indexRef.current);

            // Update state
            setDisplayedText((prev) => prev + char);
            indexRef.current++;

            // Dynamic speed logic
            let delay = baseSpeed;

            // Pause on punctuation for natural rhythm
            if (['。', '！', '？', '.', '!', '?'].includes(char)) {
                delay = baseSpeed * 15;
            } else if (['、', ','].includes(char)) {
                delay = baseSpeed * 8;
            }

            // Add random jitter for human-like feel
            const randomJitter = Math.random() * 10;

            timerRef.current = setTimeout(typeChar, delay + randomJitter);
        };

        // Start typing
        timerRef.current = setTimeout(typeChar, baseSpeed);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [fullText, baseSpeed, onComplete]);

    // Skip animation
    const skip = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setDisplayedText(fullText);
        setIsTyping(false);
        if (onComplete) onComplete();
    }, [fullText, onComplete]);

    return { displayedText, isTyping, skip };
};
