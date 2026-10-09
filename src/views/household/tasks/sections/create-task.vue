<script setup lang="ts">
import { ref } from 'vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ActionBarComponent from '@/components/action-bar-component.vue';
import { tasks } from '@/api/bably';
import { useHouseholdTasks } from '@/views/household/composables/useHouseholdTasks';
import { useToast } from '@/composables/useToast';

const emit = defineEmits<{
    detail: [title: string];
}>();

const { reloadTasks } = useHouseholdTasks();
const toast = useToast();

const title = ref('');
const processing = ref(false);

// There is no room for a field error in the bar, so a refused title is told in a toast.
const submitCreateForm = async (): Promise<void> => {
    if (title.value.trim() === '' || processing.value) {
        return;
    }

    processing.value = true;

    try {
        await tasks.create({ title: title.value.trim() });
        title.value = '';
        await reloadTasks();
    } catch (error) {
        toast.failure(error);
    } finally {
        processing.value = false;
    }
};

const openDetail = (): void => {
    emit('detail', title.value.trim());
    title.value = '';
};
</script>
<template>
    <section class="section-portal-household-tasks-create-task">
        <action-bar-component>
            <form-component class="form" @submit="submitCreateForm()">
                <input-component
                    v-model="title"
                    class="input"
                    name="title"
                    placeholder="Nieuwe taak…"
                    autocomplete="off"
                    required
                />
                <button-component
                    icon="fa-solid fa-arrows-rotate"
                    variant="secondary"
                    label="Met herhaling"
                    @click="openDetail()"
                />
                <button-component
                    icon="fa-solid fa-plus"
                    type="submit"
                    label="Taak toevoegen"
                    :disabled="processing"
                />
            </form-component>
        </action-bar-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/tasks/sections/create-task.css';
</style>
