<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, provide, ref, useId, useSlots } from 'vue';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue';
import { pageBottomBarKey, pageTitleKey } from '@/lib/pageLayout';

const props = defineProps<{
    refresh?: () => Promise<unknown>;
}>();

const slots = useSlots();

const pullToRefresh = async (event: CustomEvent): Promise<void> => {
    try {
        await props.refresh?.();
    } finally {
        (event.target as HTMLIonRefresherElement).complete();
    }
};

const isIos = Capacitor.getPlatform() === 'ios';
const compactBar = ref<HTMLElement | null>(null);
const bottomBarId = `bottom-bar-${useId()}`;
const compactTitle = ref('');

if (isIos) {
    provide(pageBottomBarKey, `#${bottomBarId}`);
}

const compactTitleElement = ref<HTMLElement | null>(null);

const titles = new Set<HTMLElement>();
let title: HTMLElement | null = null;
let collapseDistance = 1;
let scrollTop = 0;
let frame = 0;

const isShown = (element: HTMLElement): boolean => element.getClientRects().length > 0;

/**
 * As in Apple's own apps, the large title follows the finger: it shrinks towards the top
 * left while the page scrolls up, and lands exactly on the bar's title, which then takes
 * over. Only the title of the segment on screen counts; how far it travels and how small it
 * gets are measured whenever that one changes.
 */
const measure = (element: HTMLElement): void => {
    const page = compactBar.value?.parentElement;
    const target = compactTitleElement.value;

    title = element;
    compactTitle.value = element.textContent?.trim() ?? '';

    if (!page || !target) {
        return;
    }

    const largeSize = parseFloat(getComputedStyle(element).fontSize);
    const compactSize = parseFloat(getComputedStyle(target).fontSize);
    const naturalTop = element.getBoundingClientRect().top + scrollTop;

    collapseDistance = Math.max(naturalTop - target.getBoundingClientRect().top, 1);
    page.style.setProperty('--title-min-scale', (compactSize / largeSize).toFixed(3));
};

const followShownTitle = (): void => {
    const shown = [...titles].find(isShown) ?? null;

    if (shown !== null && shown !== title) {
        measure(shown);
    }
};

const render = (): void => {
    const page = compactBar.value?.parentElement;

    followShownTitle();

    if (!page || title === null) {
        return;
    }

    const progress = Math.min(Math.max(scrollTop / collapseDistance, 0), 1);
    const stretch = Math.min(Math.max(-scrollTop, 0), 120) / 120;

    page.style.setProperty('--title-progress', progress.toFixed(3));
    page.style.setProperty('--title-stretch', stretch.toFixed(3));
    compactTitle.value = title.textContent?.trim() ?? '';
};

const renderNextFrame = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
};

if (isIos) {
    provide(pageTitleKey, {
        add: (element) => {
            titles.add(element);
            void nextTick(renderNextFrame);
        },
        remove: (element) => {
            titles.delete(element);
            title = title === element ? null : title;
        },
    });
}

// A segment switch shows another header without any scrolling.
let segmentWatcher: MutationObserver | null = null;

onMounted(() => {
    const content = compactBar.value?.parentElement?.querySelector('.component-portal-page-component');

    if (!isIos || !content) {
        return;
    }

    segmentWatcher = new MutationObserver(renderNextFrame);
    segmentWatcher.observe(content, { attributes: true, attributeFilter: ['style'], subtree: true });
});

onBeforeUnmount(() => segmentWatcher?.disconnect());

const followScroll = (event: CustomEvent<{ scrollTop: number }>): void => {
    scrollTop = event.detail.scrollTop;
    renderNextFrame();
};
</script>
<template>
    <ion-page>
        <div v-if="isIos" ref="compactBar" class="compact-bar" aria-hidden="true">
            <span ref="compactTitleElement" class="compact-title">{{ compactTitle }}</span>
        </div>
        <ion-content :scroll-events="isIos" @ion-scroll="followScroll">
            <ion-refresher v-if="refresh" slot="fixed" @ion-refresh="pullToRefresh">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>
            <div v-if="isIos" :id="bottomBarId" slot="fixed" class="fixed-bottom-bar"></div>
            <div class="component-portal-page-component">
                <div class="page-content">
                    <slot></slot>
                </div>
                <div v-if="slots.bottom" class="bottom">
                    <slot name="bottom"></slot>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
@import '@css/components/portal-page-component.css';
</style>
