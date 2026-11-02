/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_REVENUECAT_ANDROID_KEY?: string;
}

declare const __HAS_FIREBASE_ANDROID__: boolean;
declare const __HAS_FIREBASE_IOS__: boolean;
