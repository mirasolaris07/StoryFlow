export interface CharacterTheme {
    id: string;
    colors: {
        background: string;
        text: string;
        border: string;
    };
    font: string;
    alignment: 'left' | 'center' | 'right';
    boxPosition: 'bottom' | 'top';
}

export const themes: Record<string, CharacterTheme> = {
    narrator: {
        id: 'narrator',
        colors: {
            background: 'rgba(0, 0, 0, 0.8)',
            text: '#ffffff',
            border: '2px solid #555'
        },
        font: '"Merriweather", serif',
        alignment: 'center',
        boxPosition: 'bottom'
    },
    heroine: {
        id: 'heroine',
        colors: {
            background: 'rgba(255, 240, 245, 0.9)', // Light Pink
            text: '#333333',
            border: '3px solid #ff69b4'
        },
        font: '"Comic Sans MS", "Chalkboard SE", sans-serif',
        alignment: 'left',
        boxPosition: 'bottom'
    },
    villain: {
        id: 'villain',
        colors: {
            background: 'rgba(20, 0, 0, 0.95)', // Deep Red Black
            text: '#ff0000',
            border: '4px double #800000'
        },
        font: '"Creepster", cursive',
        alignment: 'right',
        boxPosition: 'bottom'
    },
    // Default fallback
    default: {
        id: 'default',
        colors: {
            background: 'rgba(15, 23, 42, 0.9)', // Slate-900
            text: '#e2e8f0', // Slate-200
            border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        font: 'Inter, sans-serif',
        alignment: 'left',
        boxPosition: 'bottom'
    }
};
