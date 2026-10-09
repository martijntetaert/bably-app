<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue';
import WordmarkComponent from '@/components/wordmark-component.vue';

defineProps<{
    subtitle: string;
}>();
</script>
<template>
    <ion-page>
        <ion-content class="ion-padding">
            <div class="auth-card-component">
                <wordmark-component></wordmark-component>
                <p class="subtitle">{{ subtitle }}</p>
                <slot></slot>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
.auth-card-component {
    max-width: 26rem;
    margin: 0 auto;
    padding-top: max(4rem, calc(env(safe-area-inset-top) + 2rem));
}

.subtitle {
    color: var(--bably-muted-text);
    margin: 0.5rem 0 2rem;
}

:slotted(ion-input) {
    margin-bottom: 1rem;
}

:slotted(.links) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    font-size: 0.9rem;
}

:slotted(.links a) {
    color: var(--ion-color-primary);
    text-decoration: none;
}
</style>
