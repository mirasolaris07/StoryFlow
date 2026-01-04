import { GameState, SaveSlot } from '../types';

const STORAGE_KEY_PREFIX = 'adventureforge_save_v1_';

export const saveGame = (slotId: number, state: GameState, locationName: string, playTime: number, thumbnail?: string): SaveSlot => {
    const save: SaveSlot = {
        id: slotId,
        timestamp: new Date().toISOString(),
        thumbnail,
        gameState: state,
        locationName,
        playTime
    };

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${slotId}`, JSON.stringify(save));
    return save;
};

export const loadGame = (slotId: number): SaveSlot | null => {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotId}`);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse save", e);
        return null;
    }
};

export const listSaves = (): (SaveSlot | null)[] => {
    const slots = [];
    for (let i = 1; i <= 6; i++) {
        slots.push(loadGame(i));
    }
    return slots;
};

const GLOBAL_KEY = 'adventureforge_globals';

export const saveGlobalAttributes = (attributes: Record<string, number>) => {
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(attributes));
};

export const loadGlobalAttributes = (): Record<string, number> => {
    const data = localStorage.getItem(GLOBAL_KEY);
    try {
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to parse globals", e);
        return {};
    }
};

export const deleteSave = (slotId: number) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotId}`);
};
