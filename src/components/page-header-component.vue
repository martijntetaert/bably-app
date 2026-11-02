<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { pageTitleKey } from '@/lib/pageLayout';

const title = ref<HTMLElement | null>(null);
const titles = inject(pageTitleKey, null);

onMounted(() => title.value && titles?.add(title.value));
onBeforeUnmount(() => title.value && titles?.remove(title.value));
</script>
<template>
    <section class="component-page-header-component">
        <div class="titles">
            <div ref="title" class="title">
                <slot name="title"></slot>
            </div>
            <div class="subtitle">
                <slot name="subtitle"></slot>
            </div>
        </div>
        <div class="right">
            <slot name="right"></slot>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/page-header-component.css';
</style>
