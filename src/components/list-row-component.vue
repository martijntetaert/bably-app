<script setup lang="ts">
import { useSlots } from 'vue';

withDefaults(
    defineProps<{
        title?: string;
        meta?: string;
        grouped?: boolean;
        clickable?: boolean;
    }>(),
    {
        grouped: false,
        clickable: false,
    },
);

const slots = useSlots();
</script>
<template>
    <section
        class="component-list-row-component"
        :class="{ 'is-grouped': grouped, 'is-clickable': clickable }"
    >
        <div v-if="slots.leading" class="leading">
            <slot name="leading"></slot>
        </div>
        <div class="body">
            <div class="title">
                <slot name="title">{{ title }}</slot>
            </div>
            <div v-if="slots.meta || meta" class="meta">
                <slot name="meta">{{ meta }}</slot>
            </div>
        </div>
        <div v-if="slots.trailing" class="trailing">
            <slot name="trailing"></slot>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/list-row-component.css';
</style>
