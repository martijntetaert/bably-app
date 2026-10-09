<script setup lang="ts" generic="T extends string">
defineProps<{
    options: { value: T; label: string }[];
    label: string;
}>();

const selected = defineModel<T>({ required: true });
</script>
<template>
    <section
        class="component-segmented-control-component"
        role="radiogroup"
        :aria-label="label"
    >
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="selected === option.value"
            :class="{ 'is-active': selected === option.value }"
            @click="selected = option.value"
        >
            {{ option.label }}
        </button>
    </section>
</template>
<style scoped>
@import '@css/components/segmented-control-component.css';
</style>
