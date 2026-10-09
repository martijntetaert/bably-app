<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { whenUnauthenticated } from '@/api/client';
import { profile } from '@/api/bably';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import router from '@/router';

const session = useSession();
const push = usePush();

whenUnauthenticated(async () => {
    await session.forget();
    await router.replace('/login');
});

/**
 * "Vandaag" on the server follows the phone, so a trip abroad does not shift the day.
 */
const syncTimezone = async (): Promise<void> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (session.isVerified.value && timezone !== undefined) {
        await profile.updateTimezone(timezone).catch(() => undefined);
    }
};

onMounted(async () => {
    if (Capacitor.isNativePlatform()) {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
        await SplashScreen.hide();

        CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
                CapacitorApp.minimizeApp();
            }
        });
    }

    if (session.isVerified.value) {
        await push.resume();
        await syncTimezone();
    }
});
</script>
<template>
    <ion-app>
        <ion-router-outlet />
    </ion-app>
</template>
