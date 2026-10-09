import { toastController } from '@ionic/vue';
import { ApiError } from '@/api/client';

export function useToast() {
    const show = async (message: string, color: 'success' | 'medium' | 'danger' = 'medium'): Promise<void> => {
        const toast = await toastController.create({ message, color, duration: 2600, position: 'top' });
        await toast.present();
    };

    const success = (message: string): Promise<void> => show(message, 'success');

    const info = (message: string): Promise<void> => show(message, 'medium');

    /**
     * Validation errors belong next to their field; everything else ends up here.
     */
    const failure = (error: unknown): Promise<void> =>
        show(error instanceof ApiError ? error.message : 'Er ging iets mis. Probeer het opnieuw.', 'danger');

    return { success, info, failure };
}
