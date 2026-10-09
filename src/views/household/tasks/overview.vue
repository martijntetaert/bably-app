<script setup lang="ts">
import { ref } from 'vue';
import TasksHeader from '@/views/household/tasks/sections/tasks-header.vue';
import HouseholdNavigation from '@/views/household/sections/household-navigation.vue';
import CreateTask from '@/views/household/tasks/sections/create-task.vue';
import TasksList from '@/views/household/tasks/sections/tasks-list.vue';
import EditTask from '@/views/household/tasks/sections/edit-task.vue';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { useHouseholdTasks } from '@/views/household/composables/useHouseholdTasks';

const { tasks, openTaskCount, members, recurrences, reload } = useHouseholdTasks();

const isEditOpen = ref(false);
const editingTask = ref<TaskInterface | null>(null);
const draftTitle = ref('');

const openTaskEditor = (task: TaskInterface): void => {
    editingTask.value = task;
    draftTitle.value = task.title;
    isEditOpen.value = true;
};

const createTaskInDetail = (title: string): void => {
    editingTask.value = null;
    draftTitle.value = title;
    isEditOpen.value = true;
};

defineExpose({ refresh: reload });

void reload();
</script>
<template>
    <div id="page-portal-household-tasks-overview">
        <tasks-header :open-task-count="openTaskCount"></tasks-header>
        <household-navigation></household-navigation>
        <div v-if="tasks === null" class="tasks-skeleton">
            <div v-for="row in 4" :key="row" class="row"></div>
        </div>
        <tasks-list v-else :tasks="tasks" :members="members" @edit="openTaskEditor"></tasks-list>
        <create-task @detail="createTaskInDetail"></create-task>
        <edit-task
            v-model:open="isEditOpen"
            :task="editingTask"
            :title="draftTitle"
            :members="members"
            :recurrences="recurrences"
        ></edit-task>
    </div>
</template>
<style scoped>
@import '@css/pages/portal/household/tasks/overview.css';
</style>
