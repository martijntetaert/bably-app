import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'be.bably.app',
    appName: 'Bably',
    webDir: 'dist',
    plugins: {
        SplashScreen: {
            launchAutoHide: false,
            backgroundColor: '#6062aa',
            androidScaleType: 'CENTER_CROP',
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
        LocalNotifications: {
            smallIcon: 'ic_stat_bably',
            iconColor: '#6062AA',
        },
    },
};

export default config;
