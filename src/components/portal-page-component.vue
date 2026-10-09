<script setup lang="ts">
import { useSlots } from 'vue';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue';

const props = defineProps<{
    refresh?: () => Promise<unknown>;
}>();

const slots = useSlots();

const pullToRefresh = async (event: CustomEvent): Promise<void> => {
    try {
        await props.refresh?.();
    } finally {
        (event.target as HTMLIonRefresherElement).complete();
    }
};
</script>
<template>
    <ion-page>
        <ion-content>
            <ion-refresher v-if="refresh" slot="fixed" @ion-refresh="pullToRefresh">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>
            <div class="component-portal-page-component">
                <div class="page-content">
                    <slot></slot>
                </div>
                <div v-if="slots.bottom" class="bottom">
                    <slot name="bottom"></slot>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
@import '@css/components/portal-page-component.css';
</style>
