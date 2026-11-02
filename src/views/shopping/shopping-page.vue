<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { onIonViewDidEnter, onIonViewWillEnter, onIonViewWillLeave } from '@ionic/vue';
import { ApiError } from '@/api/client';
import { usePlus } from '@/composables/usePlus';
import { useToast } from '@/composables/useToast';
import { useKeepAwake } from '@/composables/useKeepAwake';
import PlusTeaserComponent from '@/components/plus-teaser-component.vue';
import PortalPageComponent from '@/components/portal-page-component.vue';
import SegmentedControlComponent from '@/components/segmented-control-component.vue';
import ShoppingHeader from '@/views/shopping/sections/shopping-header.vue';
import GroceryList from '@/views/shopping/sections/grocery-list.vue';
import Pantry from '@/views/shopping/sections/pantry.vue';
import AddItem from '@/views/shopping/sections/add-item.vue';
import StorePicker from '@/views/shopping/sections/store-picker.vue';
import RegularGroceries from '@/views/shopping/sections/regular-groceries.vue';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';
import { ShoppingPart, useShoppingData } from '@/views/shopping/composables/useShoppingData';

type Tab = 'list' | 'pantry';

const POLL_INTERVAL = 5000;

const route = useRoute();
const toast = useToast();
const { list, products, suggestions, stock, stores, activeTrip, restoreCachedList, refresh } = useShoppingData();
const { checkedState, onSynced } = useOfflineChecks();

const tabs: { value: Tab; label: string }[] = [
    { value: 'list', label: 'Lijst' },
    { value: 'pantry', label: 'Voorraad' },
];

const activeTab = ref<Tab>('list');
const isVisible = ref(false);
const isPickerOpen = ref(false);
const addItem = ref<InstanceType<typeof AddItem> | null>(null);
const groceryList = ref<InstanceType<typeof GroceryList> | null>(null);
let pollTimer: number | undefined;

useKeepAwake(computed(() => isVisible.value && activeTrip.value !== null));

// Ticks still waiting for the network already count, in the list and in the progress bar.
const displayedGroups = computed(() =>
    (list.value?.groups ?? []).map((group) => ({
        ...group,
        items: group.items.map((item) => ({
            ...item,
            checked: item.identifiers.every((identifier) => checkedState(identifier, item.checked)),
        })),
    }))
);

const items = computed(() => displayedGroups.value.flatMap((group) => group.items));
const checkedCount = computed(() => items.value.filter((item) => item.checked).length);

const subtitle = computed(() => {
    if (activeTrip.value) {
        return `${activeTrip.value.store.name} · in de volgorde waarin jij ze pakt`;
    }

    if (activeTab.value === 'pantry') {
        const running = stock.value.filter((product) => product.level !== 'in').length;

        return `${running} van ${stock.value.length} producten bijna op of op`;
    }

    return `${items.value.length} ${items.value.length === 1 ? 'product' : 'producten'} op de lijst`;
});

const progress = computed(() => (activeTrip.value ? { done: checkedCount.value, total: items.value.length } : null));

const { hasPlus } = usePlus();

watch(hasPlus, (isPlus) => {
    if (isPlus) {
        void load(['stock'], true);
    }
});

const load = async (parts?: ShoppingPart[], quietly = false): Promise<void> => {
    try {
        await refresh(parts);
    } catch (error) {
        const isOfflineWithList = error instanceof ApiError && error.isOffline && list.value !== null;

        if (!quietly && !isOfflineWithList) {
            toast.failure(error);
        }
    }
};

const reload = (): Promise<void> => load();

const openAdded = async (single: string | null): Promise<void> => {
    await load(['list', 'products', 'suggestions']);

    if (single) {
        await groceryList.value?.editAdded(single);
    }
};

const stopPolling = (): void => {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
};

// What the others add or tick off shows up while you stand in the store, unless the
// household turned following along live off.
watch([isVisible, () => list.value?.followsAlongLive === true], ([visible, live]) => {
    stopPolling();

    if (visible && live) {
        pollTimer = window.setInterval(() => {
            if (!document.hidden) {
                void load(['list'], true);
            }
        }, POLL_INTERVAL);
    }
});

const stopListeningForSync = onSynced(() => void load(['list'], true));

onBeforeUnmount(() => {
    stopPolling();
    stopListeningForSync();
});

onIonViewWillEnter(async () => {
    isVisible.value = true;
    await restoreCachedList();
    await load();

    if (route.query.start !== undefined && !activeTrip.value) {
        isPickerOpen.value = true;
    }
});

// The "Zet iets op de lijst" button on the push that someone went shopping lands here.
onIonViewDidEnter(() => {
    if (route.query.focus === 'add') {
        activeTab.value = 'list';
        window.setTimeout(() => addItem.value?.focus(), 150);
    }
});

onIonViewWillLeave(() => {
    isVisible.value = false;
});
</script>
<template>
    <portal-page-component :refresh="reload">
        <div id="page-portal-shopping-overview">
            <shopping-header :subtitle="subtitle" :progress="progress"></shopping-header>
            <segmented-control-component v-if="!activeTrip" v-model="activeTab" :options="tabs" label="Boodschappen" />
            <div v-if="list === null" class="skeleton" aria-busy="true">
                <span v-for="row in 5" :key="row" class="row"></span>
            </div>
            <template v-else>
                <regular-groceries
                    v-if="!activeTrip && activeTab === 'list' && suggestions.length > 0"
                    :suggestions="suggestions"
                    @changed="load"
                ></regular-groceries>
                <grocery-list
                    ref="groceryList"
                    v-if="activeTrip || activeTab === 'list'"
                    :groups="displayedGroups"
                    :shopping="activeTrip !== null"
                    :trip="activeTrip"
                    @changed="load"
                ></grocery-list>
                <pantry v-else-if="hasPlus" v-model:stock="stock" @changed="load"></pantry>
                <plus-teaser-component
                    v-else
                    icon="fa-solid fa-box-open"
                    title="Voorraad is Bably Plus"
                    text="Houd bij wat je in huis hebt. Wat bijna op is, zet Bably vanzelf op de lijst."
                ></plus-teaser-component>
            </template>
            <add-item
                ref="addItem"
                v-if="activeTrip || activeTab === 'list'"
                :shopping="activeTrip !== null"
                :products="products"
                @start-shopping="isPickerOpen = true"
                @changed="load"
                @added="openAdded"
            ></add-item>
            <store-picker
                v-model:open="isPickerOpen"
                :stores="stores"
                @started="load(['list', 'stores'])"
            ></store-picker>
        </div>
    </portal-page-component>
</template>
<style scoped>
@import '@css/pages/portal/shopping/overview.css';

#page-portal-shopping-overview {
    .skeleton {
        @apply flex flex-col gap-1.5;

        .row {
            @apply rounded-row bg-muted h-13 animate-pulse;
        }
    }
}
</style>
