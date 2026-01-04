
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.adventureforge.editor',
    appName: 'AdventureForge',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

if (process.env.CAPACITOR_LIVE_RELOAD === 'true') {
    config.server = {
        ...config.server,
        url: 'http://localhost:5173', // Change IP if testing on device
        cleartext: true
    };
}

export default config;
