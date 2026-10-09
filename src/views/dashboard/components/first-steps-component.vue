<script setup lang="ts">
import { computed } from 'vue';
import { IonRippleEffect } from '@ionic/vue';
import { checkmark, chevronForward } from '@/lib/icons';

const props = defineProps<{
    steps: { invite: boolean; store: boolean; meal: boolean };
}>();

const emit = defineEmits<{
    dismiss: [];
}>();

const items = computed(() => [
    {
        key: 'invite',
        title: 'Nodig je huisgenoten uit',
        meta: 'Samen één lijst, één menu en de taken verdeeld',
        to: '/tabs/household?segment=members',
        done: props.steps.invite,
    },
    {
        key: 'store',
        title: 'Voeg je winkel toe',
        meta: 'Bably leert er je looproute',
        to: '/settings',
        done: props.steps.store,
    },
    {
        key: 'meal',
        title: 'Plan je eerste maaltijd',
        meta: 'De ingrediënten komen vanzelf op de lijst',
        to: '/tabs/meals',
        done: props.steps.meal,
    },
]);
</script>
<template>
    <section class="first-steps-component">
        <div class="head">
            <h2 class="label">Zo begin je</h2>
            <button type="button" class="dismiss" @click="emit('dismiss')">Verbergen</button>
        </div>
        <ol class="steps">
            <li v-for="item in items" :key="item.key" :class="{ 'is-done': item.done }">
                <router-link class="step ion-activatable" :to="item.to">
                    <span class="check">
                        <i v-if="item.done" :class="checkmark" aria-hidden="true"></i>
                    </span>
                    <span class="what">
                        <span class="title">{{ item.title }}</span>
                        <span class="meta">{{ item.meta }}</span>
                    </span>
                    <i class="chevron" :class="chevronForward" aria-hidden="true"></i>
                    <ion-ripple-effect></ion-ripple-effect>
                </router-link>
            </li>
        </ol>
    </section>
</template>
<style scoped>
.first-steps-component {
    padding: 1rem;
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
    border: 1px solid var(--bably-border);
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
}

.label {
    margin: 0;
    color: var(--bably-muted-text);
    font-family: inherit;
    font-size: 0.71875rem;
    font-weight: 600;
    letter-spacing: 0.056rem;
    text-transform: uppercase;
}

.dismiss {
    padding: 0.25rem 0;
    background: none;
    color: var(--bably-muted-text);
    font-size: 0.78125rem;
    font-weight: 600;
}

.steps {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.step {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 -0.5rem;
    padding: 0.625rem 0.5rem;
    border-radius: 0.875rem;
    color: inherit;
    text-decoration: none;
}

.check {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid var(--bably-border);
    border-radius: 999px;
    color: var(--ion-color-primary-contrast);
    font-size: 0.875rem;
}

.what {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
}

.title {
    font-size: 0.90625rem;
    font-weight: 600;
}

.meta {
    color: var(--bably-muted-text);
    font-size: 0.78125rem;
}

.chevron {
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.is-done .check {
    border-color: var(--ion-color-primary);
    background: var(--ion-color-primary);
}

.is-done .title {
    color: var(--bably-muted-text);
    text-decoration: line-through;
}
</style>
