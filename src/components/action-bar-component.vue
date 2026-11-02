<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pageBottomBarKey } from '@/lib/pageLayout';

const bottomBar = inject(pageBottomBarKey, null);
const isMoved = bottomBar !== null;
const anchor = ref<HTMLElement | null>(null);
const bar = ref<HTMLElement | null>(null);
const ownerClass = ref('');
const isOwnerShown = ref(true);
let barHeight = 0;
let page: HTMLElement | null = null;
let owner: Element | null = null;
const observer = isMoved ? new ResizeObserver(() => update()) : null;

/**
 * On an iPhone the bar moves to the page's fixed layer. The section it belongs to styles
 * what is inside it, so the bar takes that section's class along. It only shows while that
 * section does (a page can hide a segment with v-show), and the page keeps room at the
 * bottom for however tall the bar is.
 */
const update = (): void => {
    isOwnerShown.value = owner === null || owner.getClientRects().length > 0;
    barHeight = bar.value?.offsetHeight ?? barHeight;

    if (isOwnerShown.value) {
        page?.style.setProperty('--action-bar-height', `${barHeight}px`);
    } else if (page?.style.getPropertyValue('--action-bar-height') === `${barHeight}px`) {
        page.style.removeProperty('--action-bar-height');
    }
};

onMounted(() => {
    if (!anchor.value || !observer) {
        return;
    }

    owner = anchor.value.closest('[class*="section-portal-"]');
    ownerClass.value = owner?.className ?? '';
    page = anchor.value.closest<HTMLElement>('.component-portal-page-component');

    if (owner) {
        observer.observe(owner);
    }
});

// The deferred teleport puts the bar in place only after this component has mounted.
watch(bar, (element, previous) => {
    if (previous) {
        observer?.unobserve(previous);
    }

    if (element) {
        observer?.observe(element);
    }
});

onBeforeUnmount(() => {
    observer?.disconnect();

    if (page?.style.getPropertyValue('--action-bar-height') === `${barHeight}px`) {
        page.style.removeProperty('--action-bar-height');
    }
});
</script>
<template>
    <span v-if="isMoved" ref="anchor" hidden></span>
    <Teleport v-if="isMoved" :to="bottomBar" defer>
        <div v-show="isOwnerShown" :class="ownerClass">
            <section ref="bar" class="component-action-bar-component">
                <slot></slot>
            </section>
        </div>
    </Teleport>
    <section v-else class="component-action-bar-component">
        <slot></slot>
    </section>
</template>
<style scoped>
@import '@css/components/action-bar-component.css';
</style>
