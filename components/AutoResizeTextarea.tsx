import React, { useRef, useEffect } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ value, onChange, placeholder, className, style, ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Height adjustment logic
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            // 1. Reset height to auto to correctly shrink
            textarea.style.height = 'auto';

            // 2. Set new height based on scrollHeight
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    // Adjust on value change
    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                onChange(e);
                adjustHeight();
            }}
            placeholder={placeholder}
            rows={1}
            className={className}
            style={{
                ...style,
                resize: 'none',
                overflow: 'hidden',
                boxSizing: 'border-box',
                lineHeight: '1.5'
            }}
            {...props}
        />
    );
};
