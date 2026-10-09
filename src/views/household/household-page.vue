<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import PortalPageComponent from '@/components/portal-page-component.vue';
import TasksOverview from '@/views/household/tasks/overview.vue';
import UsersOverview from '@/views/household/users/overview.vue';
import InsightsOverview from '@/views/household/insights/overview.vue';
import { HouseholdSegment, householdSegmentFrom } from '@/views/household/household-segment';

const route = useRoute();

const active = computed(() => householdSegmentFrom(route.query.segment));
const visited = ref(new Set<HouseholdSegment>([active.value]));

const tasksOverview = ref<InstanceType<typeof TasksOverview> | null>(null);
const usersOverview = ref<InstanceType<typeof UsersOverview> | null>(null);
const insightsOverview = ref<InstanceType<typeof InsightsOverview> | null>(null);

const refreshActive = async (): Promise<void> => {
    const refreshers: Record<HouseholdSegment, (() => Promise<void>) | undefined> = {
        tasks: tasksOverview.value?.refresh,
        members: usersOverview.value?.refresh,
        insights: insightsOverview.value?.refresh,
    };

    await refreshers[active.value]?.();
};

watch(active, (segment) => {
    if (visited.value.has(segment)) {
        void refreshActive();
    }

    visited.value.add(segment);
});

let hasEntered = false;

// Tasks get ticked off on Vandaag too, so coming back to this tab shows them fresh.
onIonViewWillEnter(() => {
    if (hasEntered) {
        void refreshActive();
    }

    hasEntered = true;
});
</script>
<template>
    <portal-page-component :refresh="refreshActive">
        <tasks-overview v-if="visited.has('tasks')" v-show="active === 'tasks'" ref="tasksOverview"></tasks-overview>
        <users-overview
            v-if="visited.has('members')"
            v-show="active === 'members'"
            ref="usersOverview"
        ></users-overview>
        <insights-overview
            v-if="visited.has('insights')"
            v-show="active === 'insights'"
            ref="insightsOverview"
        ></insights-overview>
    </portal-page-component>
</template>
