<script setup lang="ts">
import { ref, watch } from 'vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { StoreInterface } from '@/interfaces/StoreInterface';
import EditStore from '@/views/settings/sections/edit-store.vue';

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
    }
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
    <section class="section-portal-settings-stores">
        <section-label-component class="label">Winkels</section-label-component>
        <list-group-component>
            <list-row-component
                v-for="store in props.stores"
                :key="store.identifier"
                :title="store.name"
                :meta="meta(store)"
                grouped
                clickable
                @click="openStore(store)"
            >
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component grouped clickable class="add" @click="openStore(null)">
                <template #leading>
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                </template>
                <template #title>Winkel toevoegen</template>
            </list-row-component>
        </list-group-component>
        <edit-store v-model:open="isSheetOpen" :store="selectedStore" @changed="emit('changed')"></edit-store>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/stores.css';
</style>
