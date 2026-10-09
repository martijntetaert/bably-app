<script setup lang="ts">
import CheckboxComponent from '@/components/checkbox-component.vue';
import { TaskInterface } from '@/interfaces/TaskInterface';

defineProps<{
    task: TaskInterface;
}>();

const finished = defineModel<boolean>('finished', { required: true });
</script>
<template>
    <section
        class="component-tasks-task-item-component"
        :class="{ 'is-finished': finished }"
    >
        <checkbox-component v-model="finished" :disabled="!task.can.update">
            <span class="title">
                {{ task.title }}
            </span>
        </checkbox-component>
        <span class="owner">
            {{ task.user.displayName }}
        </span>
    </section>
</template>
<style scoped>
@import '@css/components/tasks/task-item-component.css';
</style>
