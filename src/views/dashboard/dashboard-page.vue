<script setup lang="ts">
import { ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { dashboard as dashboardApi, tasks } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import PortalPageComponent from '@/components/portal-page-component.vue';
import { DashboardInterface } from '@/interfaces/DashboardInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import FirstSteps from '@/views/dashboard/sections/first-steps.vue';
import DashboardHeader from '@/views/dashboard/sections/dashboard-header.vue';
import TodayMeal from '@/views/dashboard/sections/today-meal.vue';
import ShoppingList from '@/views/dashboard/sections/shopping-list.vue';
import Stock from '@/views/dashboard/sections/stock.vue';
import StartShopping from '@/views/dashboard/sections/start-shopping.vue';
import TasksToday from '@/views/dashboard/sections/tasks-today.vue';
import ShoppingNow from '@/views/dashboard/sections/shopping-now.vue';

const toast = useToast();

const dashboard = ref<DashboardInterface | null>(null);
const loadedAt = ref(0);

const reload = async (): Promise<void> => {
    try {
        dashboard.value = await dashboardApi.show();
        loadedAt.value = Date.now();
    } catch (error) {
        toast.failure(error);
    }
};

onIonViewWillEnter(reload);

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
        await reload();
    } catch (error) {
        task.finished = !finished;
        toast.failure(error);
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
        toast.failure(error);
    }
};
</script>
<template>
    <portal-page-component :refresh="reload">
        <div v-if="dashboard" id="page-portal-dashboard-overview">
            <dashboard-header :key="loadedAt" :members="dashboard.members"></dashboard-header>
            <shopping-now v-if="dashboard.activeTrip" :trip="dashboard.activeTrip"></shopping-now>
            <first-steps v-if="dashboard.start" :steps="dashboard.start" @dismiss="dismissStart()"></first-steps>
            <today-meal :meals="dashboard.tonight"></today-meal>
            <div class="split">
                <shopping-list :count="dashboard.listCount"></shopping-list>
                <stock :count="dashboard.lowStockCount"></stock>
            </div>
            <tasks-today :tasks="dashboard.tasksToday" @finish="setFinished"></tasks-today>
            <start-shopping></start-shopping>
        </div>
        <div v-else id="page-portal-dashboard-overview" class="is-loading" aria-busy="true">
            <div class="skeleton heading"></div>
            <div class="skeleton tall"></div>
            <div class="split">
                <div class="skeleton tile"></div>
                <div class="skeleton tile"></div>
            </div>
            <div class="skeleton tall"></div>
        </div>
    </portal-page-component>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/overview.css';

.is-loading .skeleton {
    @apply rounded-card bg-muted animate-pulse;

    &.heading {
        @apply mb-2 h-12 w-3/5;
    }

    &.tall {
        @apply h-28;
    }

    &.tile {
        @apply h-26;
    }
}
</style>
