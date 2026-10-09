import { onBeforeUnmount, watch, type Ref } from 'vue';
import { KeepAwake } from '@capacitor-community/keep-awake';

export function useKeepAwake(active: Ref<boolean>): void {
    const apply = (isActive: boolean): void => {
        // Android refuses on battery saver; the screen then simply sleeps.
        void (isActive ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => undefined);
    };

    watch(active, apply, { immediate: true });

    onBeforeUnmount(() => apply(false));
}
