<script setup lang="ts">
import { computed } from 'vue';
import { IonRippleEffect } from '@ionic/vue';
import { cart, chevronForward } from '@/lib/icons';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';

const props = defineProps<{
    trip: ShoppingTripInterface;
    myIdentifier: string | null;
}>();

const isYou = computed(() => props.trip.startedBy?.identifier === props.myIdentifier);

const who = computed(() => (isYou.value ? 'Je bent' : `${props.trip.startedBy?.displayName ?? 'Iemand'} is`));
</script>
<template>
    <router-link class="shopping-now-component ion-activatable" to="/tabs/shopping">
        <span class="pin">
            <i :class="cart" aria-hidden="true"></i>
        </span>
        <span class="what">
            <span class="title">{{ who }} in de {{ props.trip.store.name }}</span>
            <span class="subtitle">
                {{ isYou ? 'Ga verder met je lijst' : 'Nog iets nodig? Zet het op de lijst.' }}
            </span>
        </span>
        <i class="chevron" :class="chevronForward" aria-hidden="true"></i>
        <ion-ripple-effect></ion-ripple-effect>
    </router-link>
</template>
<style scoped>
.shopping-now-component {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: var(--bably-radius-card);
    background: var(--bably-accent-soft);
    color: var(--bably-today);
    text-decoration: none;
}

.pin {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.75rem;
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
    font-size: 1.125rem;
}

.what {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
}

.title {
    font-weight: 600;
}

.subtitle {
    font-size: 0.8125rem;
    opacity: 0.8;
}

.chevron {
    font-size: 0.875rem;
}
</style>
