import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { toast } from 'vue-sonner';
import { tasks as tasksApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { useHouseholdTasks } from '@/views/household/composables/useHouseholdTasks';

export type UseTaskCompletionReturn = {
    setFinished: (task: TaskInterface, finished: boolean, withUndo?: boolean) => Promise<void>;
};

export function useTaskCompletion(): UseTaskCompletionReturn {
    const { replaceTask, reloadTasks } = useHouseholdTasks();
    const { failure } = useToast();

    const vibrate = (finished: boolean): void => {
        const feedback = finished
            ? Haptics.notification({ type: NotificationType.Success })
            : Haptics.impact({ style: ImpactStyle.Light });

        feedback.catch(() => undefined);
    };

    const offerUndo = (task: TaskInterface): void => {
        toast(`'${task.title}' afgevinkt`, {
            duration: 4000,
            action: { label: 'Ongedaan maken', onClick: () => void setFinished(task, false, false) },
        });
    };

    const setFinished = async (task: TaskInterface, finished: boolean, withUndo = true): Promise<void> => {
        replaceTask(task.identifier, { finished });
        vibrate(finished);

        try {
            await tasksApi.complete(task.identifier, finished);

            if (finished && withUndo) {
                offerUndo(task);
            }

            await reloadTasks();
        } catch (error) {
            replaceTask(task.identifier, { finished: !finished });
            failure(error);
        }
    };

    return { setFinished };
}
