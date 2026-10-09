<script setup lang="ts">
import { ref } from 'vue';
import {
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    onIonViewWillEnter,
    RefresherCustomEvent,
} from '@ionic/vue';
import { stores as storesApi } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { StoreInterface } from '@/interfaces/StoreInterface';
import AboutComponent from '@/views/settings/components/about-component.vue';
import IntegrationsComponent from '@/views/settings/components/integrations-component.vue';
import NotificationsComponent from '@/views/settings/components/notifications-component.vue';
import ProfileComponent from '@/views/settings/components/profile-component.vue';
import StoresComponent from '@/views/settings/components/stores-component.vue';

const session = useSession();
const toast = useToast();

const stores = ref<StoreInterface[]>([]);

const loadStores = async (): Promise<void> => {
    stores.value = await storesApi.list();
};

const load = async (): Promise<void> => {
    try {
        await Promise.all([session.refreshProfile(), loadStores()]);
    } catch (error) {
        await toast.failure(error);
    }
};

const refresh = async (event: RefresherCustomEvent): Promise<void> => {
    await load();
    await event.target.complete();
};

const reloadStores = async (): Promise<void> => {
    try {
        await loadStores();
    } catch (error) {
        await toast.failure(error);
    }
};

onIonViewWillEnter(load);
</script>
<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button default-href="/tabs/dashboard" text="Vandaag"></ion-back-button>
                </ion-buttons>
                <ion-title>Instellingen</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content>
            <ion-refresher slot="fixed" @ion-refresh="refresh($event)">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>

            <template v-if="session.profile.value">
                <profile-component :profile="session.profile.value"></profile-component>
                <notifications-component
                    :wants-task-reminder="session.profile.value.wantsTaskReminder"
                ></notifications-component>
                <integrations-component :calendar-url="session.profile.value.calendarUrl"></integrations-component>
                <stores-component :stores="stores" @changed="reloadStores()"></stores-component>
                <about-component></about-component>
            </template>
            <div v-else class="loading" aria-busy="true">
                <ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
ion-content {
    --padding-bottom: 1.5rem;
}

ion-content :deep(ion-list[inset]) {
    border-radius: var(--bably-radius-card);
}

.loading {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
}

.skeleton {
    height: 7rem;
    margin: 0;
    border-radius: var(--bably-radius-card);
}
</style>
