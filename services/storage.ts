
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface IStorageService {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
}

const MobileStorage: IStorageService = {
    get: async (key) => {
        const { value } = await Preferences.get({ key });
        return value;
    },
    set: async (key, value) => {
        await Preferences.set({ key, value });
    }
};

const ElectronStorage: IStorageService = {
    get: async (key) => {
        // @ts-ignore
        if (window.electron) return await window.electron.invoke('storage-get', key);
        return localStorage.getItem(key); // Fallback
    },
    set: async (key, value) => {
        // @ts-ignore
        if (window.electron) await window.electron.invoke('storage-set', key, value);
        else localStorage.setItem(key, value);
    }
};

const WebStorage: IStorageService = {
    get: async (key) => localStorage.getItem(key),
    set: async (key, value) => localStorage.setItem(key, value)
};

export const getStorage = (): IStorageService => {
    if (Capacitor.isNativePlatform()) {
        return MobileStorage;
    }
    // Simple check for Electron
    if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
        return ElectronStorage;
    }
    return WebStorage;
};
