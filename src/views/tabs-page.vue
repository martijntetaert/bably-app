<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { PluginListenerHandle } from '@capacitor/core';
import {
    IonLabel,
    IonPage,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton,
    IonTabs,
    onIonViewDidEnter,
    onIonViewWillLeave,
} from '@ionic/vue';
import router from '@/router';
import { configureNativeTabBar, hasNativeTabBar, NativeTabBar, setOnTabs } from '@/lib/nativeTabBar';

const tabs = [
    { name: 'dashboard', label: 'Vandaag', fontAwesome: 'fa-house', symbol: 'house' },
    { name: 'shopping', label: 'Lijst', fontAwesome: 'fa-cart-shopping', symbol: 'cart' },
    { name: 'meals', label: 'Eten', fontAwesome: 'fa-utensils', symbol: 'fork.knife' },
    { name: 'household', label: 'Huis', fontAwesome: 'fa-list-check', symbol: 'checklist' },
];

const tabFromRoute = (): string | null =>
    tabs.find((tab) => router.currentRoute.value.path.startsWith(`/tabs/${tab.name}`))?.name ?? null;

const currentTab = ref<string | null>(tabFromRoute());
let tabSelected: PluginListenerHandle | null = null;

const scrollToTop = (): void => {
    const content = document.querySelector<HTMLIonContentElement>(
        'ion-tabs .ion-page:not(.ion-page-hidden) ion-content',
    );
    void content?.scrollToTop(350);
};

/**
 * The Ionic tab bar stays in the page, hidden, so a native tap goes through the same tab
 * switching (and per-tab history) as a tap on Android.
 */
const openTab = (tab: string): void => {
    if (tab === currentTab.value) {
        scrollToTop();

        return;
    }

    document.querySelector<HTMLElement>(`ion-tab-button[data-tab='${tab}']`)?.click();
};

const changeTab = (tab: string): void => {
    currentTab.value = tab;

    if (hasNativeTabBar) {
        void NativeTabBar.select({ id: tab }).catch(() => undefined);
    }
};

onMounted(async () => {
    if (!hasNativeTabBar) {
        return;
    }

    tabSelected = await NativeTabBar.addListener('tabSelected', ({ id }) => openTab(id));
    await configureNativeTabBar(
        tabs.map((tab) => ({ id: tab.name, title: tab.label, symbol: tab.symbol })),
        tabFromRoute() ?? undefined,
    ).catch(() => undefined);
});

onBeforeUnmount(() => {
    void tabSelected?.remove();
});

onIonViewDidEnter(() => {
    if (hasNativeTabBar) {
        setOnTabs(true);
    }
});

onIonViewWillLeave(() => {
    if (hasNativeTabBar) {
        setOnTabs(false);
    }
});
</script>
<template>
    <ion-page>
        <ion-tabs @ion-tabs-did-change="changeTab($event.tab)">
            <ion-router-outlet></ion-router-outlet>
            <ion-tab-bar slot="bottom" :class="{ 'is-replaced-natively': hasNativeTabBar }">
                <ion-tab-button
                    v-for="tab in tabs"
                    :key="tab.name"
                    :tab="tab.name"
                    :data-tab="tab.name"
                    :href="`/tabs/${tab.name}`"
                >
                    <i class="fa-solid" :class="tab.fontAwesome" aria-hidden="true"></i>
                    <ion-label>{{ tab.label }}</ion-label>
                </ion-tab-button>
            </ion-tab-bar>
        </ion-tabs>
    </ion-page>
</template>
