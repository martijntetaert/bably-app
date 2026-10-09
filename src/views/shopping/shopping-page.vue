<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
    IonContent,
    IonFooter,
    IonHeader,
    IonLabel,
    IonPage,
    IonProgressBar,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    onIonViewDidEnter,
    onIonViewWillEnter,
    onIonViewWillLeave,
    type RefresherCustomEvent,
} from '@ionic/vue';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import AddItemComponent from '@/views/shopping/components/add-item-component.vue';
import AddStapleComponent from '@/views/shopping/components/add-staple-component.vue';
import GroceryListComponent from '@/views/shopping/components/grocery-list-component.vue';
import PantryComponent from '@/views/shopping/components/pantry-component.vue';
import RegularGroceriesComponent from '@/views/shopping/components/regular-groceries-component.vue';
import StorePickerComponent from '@/views/shopping/components/store-picker-component.vue';
import { useKeepAwake } from '@/composables/useKeepAwake';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';
import { ShoppingPart, useShoppingData } from '@/views/shopping/composables/useShoppingData';

type Tab = 'list' | 'pantry';

const POLL_INTERVAL = 5000;

const route = useRoute();
const toast = useToast();
const { list, products, suggestions, stock, stores, activeTrip, restoreCachedList, refresh } = useShoppingData();
const { checkedState, onSynced } = useOfflineChecks();

const tab = ref<Tab>('list');
const isVisible = ref(false);
const isPickerOpen = ref(false);
const addItem = ref<InstanceType<typeof AddItemComponent> | null>(null);
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
    })),
);

const items = computed(() => displayedGroups.value.flatMap((group) => group.items));
const checkedCount = computed(() => items.value.filter((item) => item.checked).length);
const showsList = computed(() => activeTrip.value !== null || tab.value === 'list');

const subtitle = computed(() => {
    if (activeTrip.value !== null) {
        return `${activeTrip.value.store.name} · in de volgorde waarin jij ze pakt`;
    }

    if (tab.value === 'pantry') {
        const running = stock.value.filter((product) => product.level !== 'in').length;

        return `${running} van ${stock.value.length} producten bijna op of op`;
    }

    return `${items.value.length} ${items.value.length === 1 ? 'product' : 'producten'} op de lijst`;
});

const progress = computed(() => (items.value.length === 0 ? 0 : checkedCount.value / items.value.length));

const load = async (parts?: ShoppingPart[], quietly = false): Promise<void> => {
    try {
        await refresh(parts);
    } catch (error) {
        if (!quietly && !(error instanceof ApiError && error.isOffline && list.value !== null)) {
            await toast.failure(error);
        }
    }
};

const pullToRefresh = async (event: RefresherCustomEvent): Promise<void> => {
    await load();
    await event.target.complete();
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

    if (route.query.start !== undefined && activeTrip.value === null) {
        isPickerOpen.value = true;
    }
});

// The "Zet iets op de lijst" button on the push that someone went shopping lands here.
onIonViewDidEnter(() => {
    if (route.query.focus === 'add') {
        tab.value = 'list';
        window.setTimeout(() => addItem.value?.focus(), 150);
    }
});

onIonViewWillLeave(() => {
    isVisible.value = false;
});
</script>
<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Boodschappen</ion-title>
                <span v-if="activeTrip" slot="end" class="progress-label">{{ checkedCount }}/{{ items.length }} in de kar</span>
            </ion-toolbar>
            <ion-progress-bar v-if="activeTrip" :value="progress" color="success"></ion-progress-bar>
            <ion-toolbar v-else class="segment-toolbar">
                <ion-segment v-model="tab" aria-label="Boodschappen">
                    <ion-segment-button value="list"><ion-label>Lijst</ion-label></ion-segment-button>
                    <ion-segment-button value="pantry"><ion-label>Voorraad</ion-label></ion-segment-button>
                </ion-segment>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <ion-refresher slot="fixed" @ion-refresh="pullToRefresh">
                <ion-refresher-content></ion-refresher-content>
            </ion-refresher>
            <p class="subtitle">{{ subtitle }}</p>
            <div v-if="list === null" class="skeleton" aria-busy="true">
                <ion-skeleton-text v-for="row in 5" :key="row" animated class="skeleton-row"></ion-skeleton-text>
            </div>
            <template v-else-if="showsList">
                <regular-groceries-component
                    v-if="!activeTrip && suggestions.length > 0"
                    :suggestions="suggestions"
                    @changed="load(['list', 'suggestions', 'products'])"
                ></regular-groceries-component>
                <grocery-list-component :groups="displayedGroups" :trip="activeTrip" @changed="load(['list', 'stock', 'suggestions'])"></grocery-list-component>
            </template>
            <pantry-component v-else v-model:stock="stock" @changed="load(['stock', 'list', 'suggestions'])"></pantry-component>
        </ion-content>
        <ion-footer>
            <add-item-component
                v-if="showsList"
                ref="addItem"
                :shopping="activeTrip !== null"
                :products="products"
                @added="load(['list', 'products', 'suggestions'])"
                @finished="load()"
                @start-shopping="isPickerOpen = true"
            ></add-item-component>
            <add-staple-component v-else @added="load(['stock', 'list', 'suggestions'])"></add-staple-component>
        </ion-footer>
        <store-picker-component v-model:open="isPickerOpen" :stores="stores" @started="load(['list', 'stores'])"></store-picker-component>
    </ion-page>
</template>
<style scoped>
.progress-label {
    padding-inline-end: 1rem;
    color: var(--ion-color-success);
    font-size: 0.875rem;
    font-weight: 600;
}

.segment-toolbar {
    --min-height: auto;
    padding: 0 1rem 0.5rem;
}

ion-segment {
    background: var(--bably-muted);
    border-radius: 0.875rem;
}

.subtitle {
    margin: 0 0.375rem 0.75rem;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.skeleton-row {
    height: 3.25rem;
    margin: 0;
    border-radius: var(--bably-radius-row);
}
</style>
