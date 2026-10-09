<script setup lang="ts">
withDefaults(
    defineProps<{
        label: string;
        min?: number;
        max?: number;
        unit?: string;
    }>(),
    {
        min: 1,
        max: 12,
    },
);

const value = defineModel<number>({ required: true });
</script>
<template>
    <section
        class="component-stepper-component"
        role="group"
        :aria-label="label"
    >
        <button
            type="button"
            :disabled="value <= min"
            aria-label="Minder"
            @click="value--"
        >
            −
        </button>
        <span class="value">{{ value }}{{ unit ? ` ${unit}` : '' }}</span>
        <button
            type="button"
            :disabled="value >= max"
            aria-label="Meer"
            @click="value++"
        >
            +
        </button>
    </section>
</template>
<style scoped>
@import '@css/components/stepper-component.css';
</style>
