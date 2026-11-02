import { computed, ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { shopping, stores as storesApi } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { RegularGroceryInterface } from '@/interfaces/RegularGroceryInterface';
import { ShoppingListInterface } from '@/interfaces/ShoppingListInterface';
import { StockItemInterface } from '@/interfaces/StockItemInterface';
import { StoreInterface } from '@/interfaces/StoreInterface';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';

export type ShoppingPart = 'list' | 'products' | 'suggestions' | 'stock' | 'stores';

export const ALL_PARTS: ShoppingPart[] = ['list', 'products', 'suggestions', 'stock', 'stores'];

// The last list stays on the phone, so it still opens in a store without signal.
const CACHE_KEY = 'bably.shopping-list';

export function useShoppingData() {
    const { forgetSettledBefore } = useOfflineChecks();

    const list = ref<ShoppingListInterface | null>(null);
    const products = ref<ProductInterface[]>([]);
    const suggestions = ref<RegularGroceryInterface[]>([]);
    const stock = ref<StockItemInterface[]>([]);
    const stores = ref<StoreInterface[]>([]);

    const loaders: Record<ShoppingPart, () => Promise<void>> = {
        list: async () => {
            const requestedAt = Date.now();
            list.value = await shopping.list();
            forgetSettledBefore(requestedAt);
            await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(list.value) }).catch(() => undefined);
        },
        products: async () => {
            products.value = await shopping.products();
        },
        suggestions: async () => {
            suggestions.value = await shopping.suggestions();
        },
        // The pantry is Plus; without it the list must still load.
        stock: async () => {
            stock.value = useSession().hasPlus.value ? await shopping.stock() : [];
        },
        stores: async () => {
            stores.value = await storesApi.list();
        },
    };

    const restoreCachedList = async (): Promise<void> => {
        if (list.value !== null) {
            return;
        }

        const { value } = await Preferences.get({ key: CACHE_KEY }).catch(() => ({ value: null }));

        try {
            list.value = value === null ? null : (JSON.parse(value) as ShoppingListInterface);
        } catch {
            list.value = null;
        }
    };

    const refresh = async (parts: ShoppingPart[] = ALL_PARTS): Promise<void> => {
        await Promise.all(parts.map((part) => loaders[part]()));
    };

    return {
        list,
        products,
        suggestions,
        stock,
        stores,
        activeTrip: computed(() => list.value?.activeTrip ?? null),
        restoreCachedList,
        refresh,
    };
}
