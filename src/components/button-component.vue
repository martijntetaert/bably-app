<script setup lang="ts">
import { useSlots } from 'vue';

withDefaults(
    defineProps<{
        icon?: string;
        variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
        type?: 'button' | 'submit';
        label?: string;
        disabled?: boolean;
    }>(),
    {
        variant: 'primary',
        type: 'button',
    },
);

const slots = useSlots();
</script>
<template>
    <section
        class="component-button-component"
        :class="[
            `component-button-component-${variant}`,
            { 'component-button-component-icon-only': !slots.default },
        ]"
    >
        <button :type="type" :disabled="disabled" :aria-label="label">
            <i v-if="icon" :class="icon"></i>
            <span v-if="slots.default" class="text">
                <slot></slot>
            </span>
        </button>
    </section>
</template>
<style scoped>
@import '@css/components/button-component.css';
</style>
