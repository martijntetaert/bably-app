import { type Ref } from 'vue';
import { useBackButton } from '@ionic/vue';

/**
 * Sheets and dialogs are reka-ui, not Ionic overlays, so Android's back gesture would leave
 * the screen instead of closing the one that is open.
 */
export function useCloseOnBack(open: Ref<boolean>): void {
    useBackButton(100, (processNextHandler) => {
        if (open.value) {
            open.value = false;
        } else {
            processNextHandler();
        }
    });
}
