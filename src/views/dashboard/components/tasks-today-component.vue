<script setup lang="ts">
import { IonCheckbox } from '@ionic/vue';
import { TaskInterface } from '@/interfaces/TaskInterface';

const props = defineProps<{
    tasks: TaskInterface[];
}>();

const emit = defineEmits<{
    finish: [task: TaskInterface, finished: boolean];
}>();
</script>
<template>
    <section class="tasks-today-component">
        <div class="head">
            <h2 class="label">Te doen vandaag</h2>
            <router-link class="link" to="/tabs/household">Alles</router-link>
        </div>
        <div v-if="props.tasks.length > 0" class="tasks">
            <div
                v-for="task in props.tasks"
                :key="task.identifier"
                class="task"
                :class="{ 'is-finished': task.finished }"
            >
                <ion-checkbox
                    :checked="task.finished"
                    :disabled="!task.can.update"
                    justify="start"
                    label-placement="end"
                    @ion-change="emit('finish', task, $event.detail.checked)"
                >
                    <span class="title">{{ task.title }}</span>
                </ion-checkbox>
                <span class="owner">{{ task.user.displayName }}</span>
            </div>
        </div>
        <p v-else class="empty">Niets meer te doen vandaag.</p>
    </section>
</template>
<style scoped>
.tasks-today-component {
    padding: 1rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.label {
    margin: 0;
    color: var(--bably-muted-text);
    font-family: inherit;
    font-size: 0.71875rem;
    font-weight: 600;
    letter-spacing: 0.056rem;
    text-transform: uppercase;
}

.link {
    color: var(--ion-color-primary);
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: none;
}

.tasks {
    display: flex;
    flex-direction: column;
}

.task {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.75rem;
}

.task + .task {
    border-top: 1px solid var(--bably-border);
}

ion-checkbox {
    flex: 1;
    min-width: 0;
    --size: 1.375rem;
    --checkbox-background-checked: var(--ion-color-primary);
    --border-color-checked: var(--ion-color-primary);
}

ion-checkbox::part(label) {
    white-space: normal;
}

.title {
    font-size: 0.9375rem;
}

.owner {
    flex-shrink: 0;
    color: var(--bably-muted-text);
    font-size: 0.78125rem;
}

.is-finished .title {
    color: var(--bably-muted-text);
    text-decoration: line-through;
}

.empty {
    margin: 0.25rem 0;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}
</style>
