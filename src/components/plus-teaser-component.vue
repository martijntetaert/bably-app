<script setup lang="ts">
import ButtonComponent from '@/components/button-component.vue';
import { usePlus } from '@/composables/usePlus';

defineProps<{
    icon: string;
    title: string;
    text: string;
}>();

const { showPaywall } = usePlus();
</script>
<template>
    <section class="component-plus-teaser-component">
        <span class="icon"><i :class="icon" aria-hidden="true"></i></span>
        <h2 class="title">{{ title }}</h2>
        <p class="text">{{ text }}</p>
        <button-component variant="soft" @click="showPaywall()">Ontdek Bably Plus</button-component>
    </section>
</template>
<style scoped>
@import '@css/components/plus-teaser-component.css';
</style>
