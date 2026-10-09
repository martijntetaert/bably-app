<script setup lang="ts">
import { computed } from 'vue';

const slots = defineSlots();

withDefaults(
    defineProps<{
        color?: 'light' | 'dark';
    }>(),
    {
        color: 'light',
    },
);

const hasSlot = (name: string) => {
    return !!slots[name];
};

const hasHeader = computed(() => {
    return hasSlot('title') || hasSlot('actions');
});
</script>
<template>
    <section
        class="component-portlet-component"
        :class="{ 'component-portlet-component-dark': color === 'dark' }"
    >
        <div v-if="hasHeader" class="header">
            <slot name="title"></slot>
            <slot name="actions"></slot>
        </div>
        <div class="body">
            <slot name="content"></slot>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/portlet-component.css';
</style>
