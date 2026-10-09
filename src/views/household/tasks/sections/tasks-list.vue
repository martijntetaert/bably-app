<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import ListRowComponent from '@/components/list-row-component.vue';
import CheckboxComponent from '@/components/checkbox-component.vue';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { tasks as tasksApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { formatDate, now } from '@/composables/useDateTime';
import { useHouseholdTasks } from '@/views/household/composables/useHouseholdTasks';
import { useTaskCompletion } from '@/views/household/composables/useTaskCompletion';

const props = defineProps<{
    tasks: TaskInterface[];
    members?: UserInterface[];
}>();

const emit = defineEmits<{
    edit: [task: TaskInterface];
}>();

const { setFinished } = useTaskCompletion();
const { replaceTask } = useHouseholdTasks();
const toast = useToast();

// A tap on the name passes the chore to the next person, in the order of the household.
const passOn = async (task: TaskInterface): Promise<void> => {
    const members = props.members ?? [];

    if (members.length < 2) {
        return;
    }

    const current = members.findIndex((member) => member.identifier === task.user.identifier);
    const next = members[(current + 1) % members.length];

    replaceTask(task.identifier, { user: next });

    try {
        await tasksApi.assign(task.identifier, next.identifier);
    } catch (error) {
        replaceTask(task.identifier, { user: task.user });
        toast.failure(error);
    }
};

const today = computed(() => now().toISODate() ?? '');
const tomorrow = computed(() => now().plus({ days: 1 }).toISODate() ?? '');

const groups = computed(() => {
    const isDueNow = (task: TaskInterface): boolean => task.finished || task.dueOn <= today.value;

    return [
        { name: 'Vandaag', tasks: props.tasks.filter(isDueNow) },
        { name: 'Later', tasks: props.tasks.filter((task) => !isDueNow(task)) },
    ]
        .filter((group) => group.tasks.length > 0)
        .map((group) => ({
            ...group,
            openCount: group.tasks.filter((task) => !task.finished).length,
        }));
});

const isRecurring = (task: TaskInterface): boolean => task.recurrence.value !== 'none';

const dueLabel = (task: TaskInterface): string | null => {
    if (task.overdue) {
        return `Te laat · ${formatDate(task.dueOn, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    if (task.dueOn === today.value) {
        return null;
    }

    if (task.dueOn === tomorrow.value) {
        return 'Morgen';
    }

    return formatDate(task.dueOn, DateTime.DATE_MED_WITH_WEEKDAY);
};

const meta = (task: TaskInterface): string => {
    return [dueLabel(task), task.recurrence.label].filter(Boolean).join(' · ');
};
</script>
<template>
    <section class="section-portal-household-tasks-tasks-list">
        <div v-for="group in groups" :key="group.name" class="group">
            <div class="group-header">
                <h2>{{ group.name }}</h2>
                <span>{{ group.openCount }} open</span>
            </div>
            <div class="rows">
                <list-row-component
                    v-for="task in group.tasks"
                    :key="task.identifier"
                    :title="task.title"
                    :clickable="task.can.update"
                    :class="{
                        'is-finished': task.finished,
                        'is-overdue': task.overdue,
                    }"
                    @click="task.can.update && emit('edit', task)"
                >
                    <template #leading>
                        <span @click.stop>
                            <checkbox-component
                                :model-value="task.finished"
                                :disabled="!task.can.update"
                                :aria-label="task.title"
                                @update:model-value="setFinished(task, $event === true)"
                            />
                        </span>
                    </template>
                    <template #meta>
                        <i v-if="isRecurring(task)" class="fa-solid fa-arrows-rotate recurring" aria-hidden="true"></i>
                        <span>{{ meta(task) }}</span>
                    </template>
                    <template #trailing>
                        <button
                            type="button"
                            class="owner"
                            :disabled="!task.can.update || (members?.length ?? 0) < 2"
                            :aria-label="`${task.title} doorgeven, nu bij ${task.user.displayName}`"
                            @click.stop="passOn(task)"
                        >
                            {{ task.user.displayName }}
                        </button>
                    </template>
                </list-row-component>
            </div>
        </div>
        <p v-if="groups.length === 0" class="empty">Geen taken open. Voeg er hieronder een toe.</p>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/tasks/sections/tasks-list.css';
</style>
