<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue';
import WordmarkComponent from '@/components/wordmark-component.vue';

defineProps<{
    subtitle: string;
}>();
</script>
<template>
    <ion-page>
        <ion-content>
            <div class="auth-card-component">
                <div class="card">
                    <wordmark-component></wordmark-component>
                    <p class="subtitle">{{ subtitle }}</p>
                    <slot></slot>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
.auth-card-component {
    display: flex;
    min-height: 100%;
    align-items: center;
    justify-content: center;
    padding: calc(2.5rem + env(safe-area-inset-top)) calc(1.25rem + env(safe-area-inset-right))
        calc(2.5rem + env(safe-area-inset-bottom)) calc(1.25rem + env(safe-area-inset-left));
}

.card {
    width: 100%;
    max-width: 24rem;
    padding: 2rem 1.5rem;
    border-radius: 1.5rem;
    background: var(--bably-card);
    box-shadow:
        0 0 0 1px var(--bably-border),
        0 10px 15px -3px rgb(43 44 80 / 0.1),
        0 4px 6px -4px rgb(43 44 80 / 0.1);
}

.subtitle {
    margin: 0.25rem 0 1.5rem;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

:slotted(form) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

:slotted(form ion-button) {
    margin-top: 0.5rem;
    height: 2.875rem;
    --border-radius: 0.75rem;
    font-weight: 500;
}

.card :deep(.native-wrapper) {
    background: var(--bably-muted);
}

.card :deep(.has-focus .native-wrapper) {
    background: var(--bably-card);
}

:slotted(.links) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.25rem;
    font-size: 0.875rem;
}

:slotted(.links a) {
    color: var(--bably-muted-text);
    text-decoration: none;
}
</style>
