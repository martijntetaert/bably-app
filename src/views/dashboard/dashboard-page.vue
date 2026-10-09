<script setup lang="ts">
import { ref } from 'vue';
import { DateTime } from 'luxon';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonToolbar,
    onIonViewWillEnter,
    RefresherCustomEvent,
} from '@ionic/vue';
import { cart, settingsOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { dashboard as dashboardApi, tasks } from '@/api/bably';
import WordmarkComponent from '@/components/wordmark-component.vue';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { DashboardInterface } from '@/interfaces/DashboardInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import CountTileComponent from '@/views/dashboard/components/count-tile-component.vue';
import DashboardHeaderComponent from '@/views/dashboard/components/dashboard-header-component.vue';
import FirstStepsComponent from '@/views/dashboard/components/first-steps-component.vue';
import ShoppingNowComponent from '@/views/dashboard/components/shopping-now-component.vue';
import TasksTodayComponent from '@/views/dashboard/components/tasks-today-component.vue';
import TodayMealComponent from '@/views/dashboard/components/today-meal-component.vue';

const session = useSession();
const toast = useToast();

const dashboard = ref<DashboardInterface | null>(null);
const now = ref(DateTime.now().setLocale('nl-BE'));

const load = async (): Promise<void> => {
    try {
        dashboard.value = await dashboardApi.show();
        now.value = DateTime.now().setLocale('nl-BE');
    } catch (error) {
        await toast.failure(error);
    }
};

const refresh = async (event: RefresherCustomEvent): Promise<void> => {
    await load();
    await event.target.complete();
};

onIonViewWillEnter(load);

const setFinished = async (task: TaskInterface, finished: boolean): Promise<void> => {
    if (task.finished === finished) {
        return;
    }

    task.finished = finished;

    if (finished) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    }

    try {
        await tasks.complete(task.identifier, finished);
        await load();
    } catch (error) {
        task.finished = !finished;
        await toast.failure(error);
    }
};

const dismissStart = async (): Promise<void> => {
    if (dashboard.value === null) {
        return;
    }

    const steps = dashboard.value.start;
    dashboard.value.start = null;

    try {
        await dashboardApi.dismissStart();
    } catch (error) {
        dashboard.value.start = steps;
        await toast.failure(error);
    }
};
</script>
<template>
    <ion-page>
        <ion-header class="ion-no-border">
            <ion-toolbar>
                <wordmark-component slot="start" class="brand"></wordmark-component>
                <ion-buttons slot="end">
                    <ion-button router-link="/settings" aria-label="Instellingen">
                        <ion-icon slot="icon-only" :icon="settingsOutline"></ion-icon>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content>
            <ion-refresher slot="fixed" @ion-refresh="refresh($event)">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>

            <div v-if="dashboard" class="dashboard">
                <dashboard-header-component :members="dashboard.members" :now="now"></dashboard-header-component>
                <shopping-now-component
                    v-if="dashboard.activeTrip"
                    :trip="dashboard.activeTrip"
                    :my-identifier="session.user.value?.identifier ?? null"
                ></shopping-now-component>
                <first-steps-component
                    v-if="dashboard.start"
                    :steps="dashboard.start"
                    @dismiss="dismissStart()"
                ></first-steps-component>
                <today-meal-component :meals="dashboard.tonight"></today-meal-component>
                <div class="split">
                    <count-tile-component
                        :count="dashboard.listCount"
                        title="op de lijst"
                        subtitle="voor je volgende rit"
                    ></count-tile-component>
                    <count-tile-component
                        :count="dashboard.lowStockCount"
                        title="bijna op"
                        subtitle="in je voorraad"
                        calm-when-empty
                    ></count-tile-component>
                </div>
                <tasks-today-component
                    :tasks="dashboard.tasksToday"
                    @finish="(task, finished) => setFinished(task, finished)"
                ></tasks-today-component>
                <ion-button class="start-shopping" expand="block" router-link="/tabs/shopping?start=1">
                    <ion-icon slot="start" :icon="cart"></ion-icon>
                    Ik begin met winkelen
                </ion-button>
            </div>

            <div v-else class="dashboard" aria-busy="true">
                <ion-skeleton-text animated class="skeleton heading"></ion-skeleton-text>
                <ion-skeleton-text animated class="skeleton tall"></ion-skeleton-text>
                <div class="split">
                    <ion-skeleton-text animated class="skeleton tile"></ion-skeleton-text>
                    <ion-skeleton-text animated class="skeleton tile"></ion-skeleton-text>
                </div>
                <ion-skeleton-text animated class="skeleton tall"></ion-skeleton-text>
            </div>
        </ion-content>
    </ion-page>
</template>
<style scoped>
.brand {
    padding-left: 1rem;
}

.brand :deep(img) {
    height: 1.75rem;
}

.dashboard {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 0.25rem 1rem 1.5rem;
}

.split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.875rem;
}

.start-shopping {
    --background: var(--bably-accent-soft);
    --background-activated: var(--bably-accent-soft);
    --color: var(--bably-today);
    --border-radius: var(--bably-radius-row);
    --box-shadow: none;
    min-height: 3rem;
    margin: 0;
    font-weight: 600;
}

.skeleton {
    margin: 0;
    border-radius: var(--bably-radius-card);
}

.skeleton.heading {
    width: 60%;
    height: 2.5rem;
}

.skeleton.tall {
    height: 6.5rem;
}

.skeleton.tile {
    height: 6rem;
}
</style>
