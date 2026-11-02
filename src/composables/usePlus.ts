import { ref } from 'vue';
import { useSession } from '@/composables/useSession';

const isPaywallOpen = ref(false);

export function usePlus() {
    const { hasPlus } = useSession();

    const showPaywall = (): void => {
        isPaywallOpen.value = true;
    };

    /**
     * Does what a Plus feature does, or shows what Plus is when the household has none.
     */
    const withPlus = (action: () => void): void => {
        if (hasPlus.value) {
            action();
        } else {
            showPaywall();
        }
    };

    return { hasPlus, isPaywallOpen, showPaywall, withPlus };
}
