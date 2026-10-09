<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    actionSheetController,
    IonCheckbox,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonSkeletonText,
    toastController,
} from '@ionic/vue';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { personOutline, repeat, swapHorizontal, trashOutline } from 'ionicons/icons';
import { household, tasks as tasksApi } from '@/api/bably';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { RecurrenceInterface } from '@/interfaces/RecurrenceInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import TaskEditorComponent from '@/views/household/components/task-editor-component.vue';
import { taskMeta, today } from '@/views/household/composables/useTaskDates';

const emit = defineEmits<{
    openTaskCount: [count: number];
}>();

const toast = useToast();
const confirm = useConfirm();

const taskList = ref<TaskInterface[] | null>(null);
const members = ref<UserInterface[]>([]);
const recurrences = ref<RecurrenceInterface[]>([]);

const isEditorOpen = ref(false);
const editingTask = ref<TaskInterface | null>(null);
const draftTitle = ref('');

const loadTasks = async (): Promise<void> => {
    const list = await tasksApi.list();

    taskList.value = list.data;
    emit('openTaskCount', list.openTaskCount);
};

const refresh = async (): Promise<void> => {
    try {
        const [, memberList, recurrenceList] = await Promise.all([loadTasks(), household.members(), tasksApi.recurrences()]);

        members.value = memberList;
        recurrences.value = recurrenceList;
    } catch (error) {
        await toast.failure(error);
    }
};

const reloadTasks = async (): Promise<void> => {
    try {
        await loadTasks();
    } catch (error) {
        await toast.failure(error);
    }
};

const groups = computed(() => {
    const tasks = taskList.value ?? [];
    const isOverdue = (task: TaskInterface): boolean => !task.finished && task.overdue;
    const isDueNow = (task: TaskInterface): boolean => !isOverdue(task) && (task.finished || task.dueOn <= today());

    return [
        { name: 'Te laat', tasks: tasks.filter(isOverdue) },
        { name: 'Vandaag', tasks: tasks.filter(isDueNow) },
        { name: 'Later', tasks: tasks.filter((task) => !isOverdue(task) && !isDueNow(task)) },
    ]
        .filter((group) => group.tasks.length > 0)
        .map((group) => ({ ...group, openCount: group.tasks.filter((task) => !task.finished).length }));
});

const replaceTask = (identifier: string, changes: Partial<TaskInterface>): void => {
    taskList.value = (taskList.value ?? []).map((task) => (task.identifier === identifier ? { ...task, ...changes } : task));
};

const vibrate = (finished: boolean): void => {
    const feedback = finished ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: ImpactStyle.Light });

    feedback.catch(() => undefined);
};

const offerUndo = async (task: TaskInterface): Promise<void> => {
    await toastController.dismiss().catch(() => undefined);

    const undoToast = await toastController.create({
        message: `'${task.title}' afgevinkt`,
        duration: 4000,
        position: 'bottom',
        positionAnchor: 'household-quick-add',
        buttons: [{ text: 'Ongedaan maken', role: 'cancel', handler: () => void setFinished(task, false, false) }],
    });

    await undoToast.present();
};

const setFinished = async (task: TaskInterface, finished: boolean, withUndo = true): Promise<void> => {
    replaceTask(task.identifier, { finished });
    vibrate(finished);

    try {
        await tasksApi.complete(task.identifier, finished);

        if (finished && withUndo) {
            void offerUndo(task);
        }

        await loadTasks();
    } catch (error) {
        replaceTask(task.identifier, { finished: !finished });
        await toast.failure(error);
    }
};

const closeSliding = async (event?: Event): Promise<void> => {
    await (event?.target as HTMLElement | undefined)?.closest('ion-item-sliding')?.close();
};

const handOff = async (task: TaskInterface, event?: Event): Promise<void> => {
    await closeSliding(event);

    const others = members.value.filter((member) => member.identifier !== task.user.identifier);

    if (others.length === 0) {
        await toast.info('Er is nog niemand anders in het huishouden.');

        return;
    }

    const sheet = await actionSheetController.create({
        header: `${task.title} doorgeven, nu bij ${task.user.displayName}`,
        buttons: [
            ...others.map((member) => ({ text: member.displayName, data: member })),
            { text: 'Annuleren', role: 'cancel' },
        ],
    });

    await sheet.present();

    const { data, role } = await sheet.onDidDismiss<UserInterface>();

    if (role === 'cancel' || data === undefined) {
        return;
    }

    const previous = task.user;
    replaceTask(task.identifier, { user: data });

    try {
        await tasksApi.assign(task.identifier, data.identifier);
        await toast.success(`${task.title} ligt nu bij ${data.displayName}.`);
    } catch (error) {
        replaceTask(task.identifier, { user: previous });
        await toast.failure(error);
    }
};

const destroy = async (task: TaskInterface, event: Event): Promise<void> => {
    await closeSliding(event);

    if (!(await confirm('Taak verwijderen?', `'${task.title}' verdwijnt uit de lijst van het huishouden.`))) {
        return;
    }

    try {
        await tasksApi.remove(task.identifier);
        await loadTasks();
    } catch (error) {
        await toast.failure(error);
    }
};

const edit = (task: TaskInterface): void => {
    if (!task.can.update) {
        return;
    }

    editingTask.value = task;
    draftTitle.value = task.title;
    isEditorOpen.value = true;
};

const openNew = (title: string): void => {
    editingTask.value = null;
    draftTitle.value = title;
    isEditorOpen.value = true;
};

defineExpose({ refresh, reloadTasks, openNew });

void refresh();
</script>
<template>
    <div class="tasks">
        <div v-if="taskList === null" class="skeleton">
            <ion-skeleton-text v-for="row in 4" :key="row" :animated="true" class="row"></ion-skeleton-text>
        </div>

        <template v-else>
            <section v-for="group in groups" :key="group.name" class="group" :class="{ 'is-overdue': group.name === 'Te laat' }">
                <header class="group-header">
                    <h2>{{ group.name }}</h2>
                    <span>{{ group.openCount }} open</span>
                </header>
                <ion-list class="rows" lines="full">
                    <ion-item-sliding v-for="task in group.tasks" :key="task.identifier" :disabled="!task.can.update">
                        <ion-item :button="task.can.update" :detail="false" :class="{ 'is-finished': task.finished }" @click="edit(task)">
                            <ion-checkbox
                                slot="start"
                                :checked="task.finished"
                                :disabled="!task.can.update"
                                :aria-label="task.title"
                                @click.stop
                                @ion-change="setFinished(task, $event.detail.checked)"
                            ></ion-checkbox>
                            <ion-label>
                                <h3 class="title">{{ task.title }}</h3>
                                <p class="meta">
                                    <ion-icon v-if="task.recurrence.value !== 'none'" :icon="repeat" aria-hidden="true"></ion-icon>
                                    {{ taskMeta(task) }}
                                </p>
                            </ion-label>
                            <button
                                slot="end"
                                type="button"
                                class="owner"
                                :disabled="!task.can.update || members.length < 2"
                                :aria-label="`${task.title} doorgeven, nu bij ${task.user.displayName}`"
                                @click.stop="handOff(task)"
                            >
                                <ion-icon :icon="personOutline" aria-hidden="true"></ion-icon>
                                {{ task.user.displayName }}
                            </button>
                        </ion-item>
                        <ion-item-options side="end">
                            <ion-item-option v-if="members.length > 1" color="medium" @click="handOff(task, $event)">
                                <ion-icon slot="top" :icon="swapHorizontal"></ion-icon>
                                Doorgeven
                            </ion-item-option>
                            <ion-item-option v-if="task.can.delete" color="danger" @click="destroy(task, $event)">
                                <ion-icon slot="top" :icon="trashOutline"></ion-icon>
                                Verwijderen
                            </ion-item-option>
                        </ion-item-options>
                    </ion-item-sliding>
                </ion-list>
            </section>

            <p v-if="groups.length === 0" class="empty">Geen taken open. Voeg er hieronder een toe.</p>
        </template>

        <task-editor-component
            v-model:open="isEditorOpen"
            :task="editingTask"
            :title="draftTitle"
            :members="members"
            :recurrences="recurrences"
            @saved="reloadTasks"
        ></task-editor-component>
    </div>
</template>
<style scoped>
.tasks {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.skeleton .row {
    height: 3.5rem;
    margin: 0;
    border-radius: var(--bably-radius-row);
}

.group-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 0.25rem 0.5rem;
}

.group-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
}

.group-header span {
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}

.group.is-overdue .group-header h2 {
    color: var(--ion-color-danger);
}

.rows {
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
}

.rows ion-item {
    --background: var(--bably-card);
    --border-color: var(--bably-border);
    --padding-start: 1rem;
    --min-height: 3.75rem;
}

.rows ion-item-sliding:last-child ion-item {
    --border-width: 0;
    --inner-border-width: 0;
}

.title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    white-space: normal;
}

.meta {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0.125rem 0 0;
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}

.group.is-overdue .meta {
    color: var(--ion-color-danger);
}

.is-finished .title {
    color: var(--bably-muted-text);
    text-decoration: line-through;
}

.owner {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 8rem;
    padding: 0.375rem 0.625rem;
    overflow: hidden;
    border: 0;
    border-radius: 999px;
    background: var(--bably-muted);
    color: var(--bably-home);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.owner:disabled {
    color: var(--bably-muted-text);
    opacity: 1;
}

.empty {
    margin: 3rem 1rem;
    color: var(--bably-muted-text);
    text-align: center;
}
</style>
