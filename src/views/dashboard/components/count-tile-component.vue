<script setup lang="ts">
import { IonRippleEffect } from '@ionic/vue';

const props = withDefaults(
    defineProps<{
        count: number;
        title: string;
        subtitle: string;
        calmWhenEmpty?: boolean;
    }>(),
    { calmWhenEmpty: false },
);
</script>
<template>
    <router-link class="count-tile-component ion-activatable" to="/tabs/shopping">
        <div class="total" :class="{ 'is-calm': props.calmWhenEmpty && props.count === 0 }">{{ props.count }}</div>
        <div class="title">{{ props.title }}</div>
        <div class="subtitle">{{ props.subtitle }}</div>
        <ion-ripple-effect></ion-ripple-effect>
    </router-link>
</template>
<style scoped>
.count-tile-component {
    position: relative;
    overflow: hidden;
    display: block;
    padding: 1rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
    color: inherit;
    text-decoration: none;
}

.total {
    color: var(--bably-groceries);
    font-family: var(--bably-font-display);
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04rem;
}

.total.is-calm {
    color: var(--bably-muted-text);
}

.title {
    margin-top: 0.5rem;
    font-weight: 600;
}

.subtitle {
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}
</style>
