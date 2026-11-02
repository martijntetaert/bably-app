<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Capacitor } from '@capacitor/core';

const bar = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;

/**
 * On an iPhone the bar lies still above the tab bar while the page bounces underneath, so
 * its page has to keep room for however tall the bar is at the moment.
 */
onMounted(() => {
    const page = bar.value?.closest<HTMLElement>('.component-portal-page-component');

    if (Capacitor.getPlatform() !== 'ios' || !bar.value || !page) {
        return;
    }

    observer = new ResizeObserver(([entry]) => {
        page.style.setProperty('--action-bar-height', `${entry.borderBoxSize[0].blockSize}px`);
    });
    observer.observe(bar.value);
});

onBeforeUnmount(() => {
    observer?.disconnect();
    bar.value?.closest<HTMLElement>('.component-portal-page-component')?.style.removeProperty('--action-bar-height');
});
</script>
<template>
    <section ref="bar" class="component-action-bar-component">
        <slot></slot>
    </section>
</template>
<style scoped>
@import '@css/components/action-bar-component.css';
</style>
