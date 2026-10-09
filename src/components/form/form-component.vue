<script setup lang="ts">
const emit = defineEmits<{
    submit: [];
}>();
</script>
<template>
    <form class="component-form-component" @submit.prevent="emit('submit')">
        <slot></slot>
    </form>
</template>
<style scoped>
@import '@css/components/form/form-component.css';
</style>
