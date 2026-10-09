import { toast } from 'vue-sonner';
import { ApiError } from '@/api/client';

export function useToast() {
    const success = (message: string): void => {
        toast.success(message);
    };

    const info = (message: string): void => {
        toast.info(message);
    };

    /**
     * Validation errors belong next to their field; everything else ends up here.
     */
    const failure = (error: unknown): void => {
        toast.error(error instanceof ApiError ? error.message : 'Er ging iets mis. Probeer het opnieuw.');
    };

    return { success, info, failure };
}
