<script setup lang="ts">
import PortletComponent from '@/components/portlet-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import TaskItemComponent from '@/components/tasks/task-item-component.vue';
import { TaskInterface } from '@/interfaces/TaskInterface';

const props = defineProps<{
    tasks: TaskInterface[];
}>();

const emit = defineEmits<{
    finish: [task: TaskInterface, finished: boolean];
}>();
</script>
<template>
    <section class="section-portal-dashboard-tasks-today">
        <portlet-component>
            <template #title>
                <section-label-component>Te doen vandaag</section-label-component>
            </template>
            <template #actions>
                <router-link class="link" to="/tabs/household">Alles</router-link>
            </template>
            <template #content>
                <div v-if="props.tasks.length > 0" class="content">
                    <task-item-component
                        v-for="task in props.tasks"
                        :key="task.identifier"
                        :task="task"
                        :finished="task.finished"
                        @update:finished="emit('finish', task, $event)"
                    />
                </div>
                <p v-else class="empty">Niets meer te doen vandaag.</p>
            </template>
        </portlet-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/tasks-today.css';
</style>
