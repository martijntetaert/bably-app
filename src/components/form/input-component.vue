<script setup lang="ts">
withDefaults(
    defineProps<{
        type?: 'text' | 'email' | 'password' | 'number' | 'search';
        name?: string;
        placeholder?: string;
        autocomplete?: string;
        required?: boolean;
        disabled?: boolean;
    }>(),
    {
        type: 'text',
    },
);

const value = defineModel<string>();
</script>
<template>
    <section class="component-input-component">
        <input
            v-model="value"
            :type="type"
            :name="name"
            :placeholder="placeholder"
            :autocomplete="autocomplete"
            :required="required"
            :disabled="disabled"
        />
    </section>
</template>
<style scoped>
@import '@css/components/form/input-component.css';
</style>
