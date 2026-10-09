import { ref } from 'vue';
import { household, tasks as tasksApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { RecurrenceInterface } from '@/interfaces/RecurrenceInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';

const tasks = ref<TaskInterface[] | null>(null);
const openTaskCount = ref<number | null>(null);
const members = ref<UserInterface[] | undefined>(undefined);
const recurrences = ref<RecurrenceInterface[] | undefined>(undefined);

export function useHouseholdTasks() {
    const toast = useToast();

    const reloadTasks = async (): Promise<void> => {
        try {
            const list = await tasksApi.list();

            tasks.value = list.data;
            openTaskCount.value = list.openTaskCount;
        } catch (error) {
            toast.failure(error);
        }
    };

    const reload = async (): Promise<void> => {
        await Promise.all([
            reloadTasks(),
            household
                .members()
                .then((list) => (members.value = list))
                .catch(toast.failure),
            tasksApi
                .recurrences()
                .then((list) => (recurrences.value = list))
                .catch(toast.failure),
        ]);
    };

    const replaceTask = (identifier: string, changes: Partial<TaskInterface>): void => {
        tasks.value = (tasks.value ?? []).map((task) => (task.identifier === identifier ? { ...task, ...changes } : task));
    };

    return { tasks, openTaskCount, members, recurrences, reload, reloadTasks, replaceTask };
}
