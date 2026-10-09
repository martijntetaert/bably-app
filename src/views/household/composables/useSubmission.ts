import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';

export function useSubmission() {
    const toast = useToast();

    const processing = ref(false);
    const errors = ref<Record<string, string>>({});

    const clearErrors = (): void => {
        errors.value = {};
    };

    const submit = async (action: () => Promise<unknown>): Promise<boolean> => {
        processing.value = true;
        clearErrors();

        try {
            await action();

            return true;
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                errors.value = Object.fromEntries(
                    Object.entries(error.errors).map(([field, messages]) => [field, messages[0]]),
                );
            } else {
                toast.failure(error);
            }

            return false;
        } finally {
            processing.value = false;
        }
    };

    return { processing, errors, clearErrors, submit };
}
