<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonIcon, IonItem, IonLabel, IonList, IonListHeader } from '@ionic/vue';
import { add } from 'ionicons/icons';
import { StoreInterface } from '@/interfaces/StoreInterface';
import EditStoreComponent from '@/views/settings/components/edit-store-component.vue';

const props = defineProps<{
    stores: StoreInterface[];
}>();

const emit = defineEmits<{
    changed: [];
}>();

const isSheetOpen = ref(false);
const selectedStore = ref<StoreInterface | null>(null);

watch(
    () => props.stores,
    (stores) => {
        const identifier = selectedStore.value?.identifier;

        if (identifier !== undefined) {
            selectedStore.value = stores.find((store) => store.identifier === identifier) ?? selectedStore.value;
        }
    },
);

const openStore = (store: StoreInterface | null): void => {
    selectedStore.value = store;
    isSheetOpen.value = true;
};

const meta = (store: StoreInterface): string => {
    const visits = `${store.tripsCount} keer gewinkeld`;

    return store.place ? `${store.place} · ${visits}` : visits;
};
</script>
<template>
    <section class="stores-component">
        <ion-list inset>
            <ion-list-header>
                <ion-label>Winkels</ion-label>
            </ion-list-header>
            <ion-item v-for="store in props.stores" :key="store.identifier" button detail @click="openStore(store)">
                <ion-label>
                    <h3>{{ store.name }}</h3>
                    <p>{{ meta(store) }}</p>
                </ion-label>
            </ion-item>
            <ion-item button lines="none" class="add" @click="openStore(null)">
                <ion-icon slot="start" :icon="add" aria-hidden="true"></ion-icon>
                <ion-label>Winkel toevoegen</ion-label>
            </ion-item>
        </ion-list>
        <edit-store-component
            v-model:open="isSheetOpen"
            :store="selectedStore"
            @changed="emit('changed')"
        ></edit-store-component>
    </section>
</template>
<style scoped>
h3 {
    margin: 0;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0;
}

.add {
    --color: var(--ion-color-primary);
    font-weight: 600;
}

.add ion-icon {
    color: var(--ion-color-primary);
}
</style>
