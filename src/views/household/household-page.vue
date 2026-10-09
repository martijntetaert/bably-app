<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
    IonBadge,
    IonContent,
    IonFooter,
    IonHeader,
    IonLabel,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    onIonViewWillEnter,
    RefresherCustomEvent,
} from '@ionic/vue';
import InsightsSegmentComponent from '@/views/household/components/insights-segment-component.vue';
import MembersSegmentComponent from '@/views/household/components/members-segment-component.vue';
import TaskQuickAddComponent from '@/views/household/components/task-quick-add-component.vue';
import TasksSegmentComponent from '@/views/household/components/tasks-segment-component.vue';

type Segment = 'tasks' | 'members' | 'insights';

const segments: Segment[] = ['tasks', 'members', 'insights'];

const route = useRoute();

const segmentFrom = (value: unknown): Segment | null => (segments.includes(value as Segment) ? (value as Segment) : null);

const active = ref<Segment>(segmentFrom(route.query.segment) ?? 'tasks');
const visited = ref(new Set<Segment>([active.value]));
const openTaskCount = ref<number | null>(null);

const tasksSegment = ref<InstanceType<typeof TasksSegmentComponent> | null>(null);
const membersSegment = ref<InstanceType<typeof MembersSegmentComponent> | null>(null);
const insightsSegment = ref<InstanceType<typeof InsightsSegmentComponent> | null>(null);

const choose = (value: unknown): void => {
    const segment = segmentFrom(value);

    if (segment !== null) {
        active.value = segment;
        visited.value.add(segment);
    }
};

watch(() => route.query.segment, choose);

const refreshActive = async (): Promise<void> => {
    const refreshers: Record<Segment, (() => Promise<void>) | undefined> = {
        tasks: tasksSegment.value?.refresh,
        members: membersSegment.value?.refresh,
        insights: insightsSegment.value?.refresh,
    };

    await refreshers[active.value]?.();
};

const pullToRefresh = async (event: RefresherCustomEvent): Promise<void> => {
    await refreshActive();
    await event.target.complete();
};

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
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Huis</ion-title>
            </ion-toolbar>
            <ion-toolbar>
                <ion-segment :value="active" @ion-change="choose($event.detail.value)">
                    <ion-segment-button value="tasks">
                        <ion-label>
                            Taken
                            <ion-badge v-if="openTaskCount" class="count" :aria-label="`${openTaskCount} taken open`">
                                {{ openTaskCount }}
                            </ion-badge>
                        </ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="members">
                        <ion-label>Leden</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="insights">
                        <ion-label>Inzicht</ion-label>
                    </ion-segment-button>
                </ion-segment>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <ion-refresher slot="fixed" @ion-refresh="pullToRefresh">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>

            <tasks-segment-component
                v-if="visited.has('tasks')"
                v-show="active === 'tasks'"
                ref="tasksSegment"
                @open-task-count="openTaskCount = $event"
            ></tasks-segment-component>
            <members-segment-component v-if="visited.has('members')" v-show="active === 'members'" ref="membersSegment"></members-segment-component>
            <insights-segment-component v-if="visited.has('insights')" v-show="active === 'insights'" ref="insightsSegment"></insights-segment-component>
        </ion-content>
        <ion-footer v-if="active === 'tasks'" id="household-quick-add">
            <task-quick-add-component @added="tasksSegment?.reloadTasks()" @detail="tasksSegment?.openNew($event)"></task-quick-add-component>
        </ion-footer>
    </ion-page>
</template>
<style scoped>
ion-segment-button {
    --indicator-color: var(--bably-home);
    --color-checked: var(--bably-home);
    text-transform: none;
}

.count {
    margin-inline-start: 0.25rem;
    --background: var(--bably-home);
    --color: var(--bably-card);
    --padding-start: 0.4rem;
    --padding-end: 0.4rem;
    font-size: 0.6875rem;
    vertical-align: middle;
}

ion-footer {
    background: var(--ion-background-color);
}
</style>
