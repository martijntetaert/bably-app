<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { mailOutline } from 'ionicons/icons';
import { getInitials } from '@/lib/initials';

const props = withDefaults(
    defineProps<{
        name: string;
        photoUrl?: string | null;
        pending?: boolean;
        size?: 'sm' | 'md' | 'lg';
    }>(),
    { photoUrl: null, pending: false, size: 'md' },
);

const initials = computed(() => getInitials(props.name));
</script>
<template>
    <span class="avatar-component" :class="[`is-${props.size}`, { 'is-pending': props.pending }]" aria-hidden="true">
        <ion-icon v-if="props.pending" :icon="mailOutline"></ion-icon>
        <img v-else-if="props.photoUrl" :src="props.photoUrl" alt="" />
        <span v-else>{{ initials }}</span>
    </span>
</template>
<style scoped>
.avatar-component {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 50%;
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
    font-family: var(--bably-font-display);
    font-weight: 700;
}

.is-sm {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
}

.is-md {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
}

.is-lg {
    width: 5.5rem;
    height: 5.5rem;
    font-size: 2rem;
}

.is-pending {
    border: 1.5px dashed var(--bably-border);
    background: var(--bably-muted);
    color: var(--bably-muted-text);
}

img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
