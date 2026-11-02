<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { shopping, stores as storesApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { StoreInterface } from '@/interfaces/StoreInterface';

type Step = 'locating' | 'known' | 'unknown' | 'manual' | 'unavailable';

const props = defineProps<{
    stores: StoreInterface[];
}>();

const emit = defineEmits<{
    started: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();
const step = ref<Step>('locating');
const recognisedStore = ref<StoreInterface | null>(null);
const isShowingOtherStores = ref(false);
const isStarting = ref(false);
const isSaving = ref(false);
const name = ref('');
const place = ref('');
const position = ref<{ latitude: number; longitude: number } | null>(null);
const errors = ref<Record<string, string[]>>({});

const title = computed(() => {
    switch (step.value) {
        case 'locating':
            return 'Bably kijkt waar je bent';
        case 'known':
            return recognisedStore.value?.name ?? '';
        case 'unknown':
            return 'Welke winkel is dit?';
        case 'manual':
            return 'Winkel toevoegen';
        default:
            return 'Waar ben je?';
    }
});

const description = computed(() => {
    switch (step.value) {
        case 'locating':
            return 'Even geduld, we zoeken de winkel op je locatie.';
        case 'known':
            return recognisedStore.value?.place ?? 'Herkend op je locatie';
        case 'unknown':
            return 'Bably kent deze plek nog niet. Geef ze een naam en ze wordt volgende keer herkend.';
        case 'manual':
            return 'Zonder locatie: je kiest deze winkel zelf als je begint.';
        default:
            return 'Je locatie is niet beschikbaar. Kies de winkel zelf.';
    }
});

const routeMeta = computed(() => {
    const store = recognisedStore.value;

    if (!store || store.routeLength === 0) {
        return 'Nog geen route. Vink af terwijl je loopt: Bably leert waar alles staat.';
    }

    return `Bably kent hier de plaats van ${store.routeLength} producten, geleerd uit ${store.tripsCount} ${
        store.tripsCount === 1 ? 'bezoek' : 'bezoeken'
    }.`;
});

// On iOS a position asked while the permission question is still open never resolves, so
// the permission is settled first.
const mayLocate = async (): Promise<boolean> => {
    let permissions = await Geolocation.checkPermissions();

    if (permissions.location.startsWith('prompt')) {
        permissions = await Geolocation.requestPermissions();
    }

    return permissions.location === 'granted' || permissions.coarseLocation === 'granted';
};

const locate = async (): Promise<void> => {
    try {
        if (!(await mayLocate())) {
            step.value = 'unavailable';

            return;
        }

        const { coords } = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
        });
        const { store } = await storesApi.recognize(coords.latitude, coords.longitude);

        recognisedStore.value = store;
        position.value = {
            latitude: coords.latitude,
            longitude: coords.longitude,
        };
        step.value = store ? 'known' : 'unknown';
    } catch {
        step.value = 'unavailable';
    }
};

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    step.value = 'locating';
    recognisedStore.value = null;
    isShowingOtherStores.value = false;
    name.value = '';
    place.value = '';
    position.value = null;
    errors.value = {};
    void locate();
});

const startIn = async (store: StoreInterface): Promise<void> => {
    isStarting.value = true;

    try {
        await shopping.startTrip(store.identifier);
        toast.success(`Op de route van ${store.name}. Vink af terwijl je loopt.`);
        open.value = false;
        emit('started');
    } catch (error) {
        toast.failure(error);
    } finally {
        isStarting.value = false;
    }
};

const addManually = (): void => {
    position.value = null;
    step.value = 'manual';
};

const saveAndStart = async (): Promise<void> => {
    isSaving.value = true;
    errors.value = {};

    try {
        const store = await storesApi.create({
            name: name.value.trim(),
            place: place.value.trim() === '' ? null : place.value.trim(),
            latitude: position.value?.latitude ?? null,
            longitude: position.value?.longitude ?? null,
            startShopping: true,
        });
        toast.success(`${store.name} bewaard. Vink af terwijl je loopt: Bably leert de route.`);
        open.value = false;
        emit('started');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        isSaving.value = false;
    }
};

const otherStores = computed(() =>
    props.stores.filter((store) => store.identifier !== recognisedStore.value?.identifier)
);
</script>
<template>
    <section class="section-portal-shopping-store-picker">
        <drawer-component v-model:open="open" :title="title" :description="description">
            <div class="picker">
                <div v-if="step === 'locating'" class="locating" aria-live="polite">
                    <span class="pin"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span>
                </div>

                <template v-else-if="step === 'known' && recognisedStore">
                    <p class="route">{{ routeMeta }}</p>
                    <button-component :disabled="isStarting" @click="startIn(recognisedStore)">
                        Hier winkelen
                    </button-component>
                </template>

                <form-component
                    v-else-if="step === 'unknown' || step === 'manual'"
                    class="form"
                    @submit="saveAndStart()"
                >
                    <div class="field">
                        <section-label-component>Naam</section-label-component>
                        <input-component
                            v-model="name"
                            name="store"
                            placeholder="Colruyt"
                            autocomplete="off"
                            required
                        />
                        <p v-if="errors.name" class="error">
                            {{ errors.name[0] }}
                        </p>
                    </div>
                    <div class="field">
                        <section-label-component>Plaats</section-label-component>
                        <input-component
                            v-model="place"
                            name="spot"
                            placeholder="Straat, gemeente"
                            autocomplete="off"
                        />
                    </div>
                    <button-component type="submit" :disabled="isSaving || name.trim() === ''">
                        Opslaan en beginnen
                    </button-component>
                </form-component>

                <template v-if="step !== 'locating'">
                    <button
                        v-if="step !== 'unavailable'"
                        type="button"
                        class="toggle-other"
                        :aria-expanded="isShowingOtherStores"
                        @click="isShowingOtherStores = !isShowingOtherStores"
                    >
                        {{ isShowingOtherStores ? 'Andere winkels verbergen' : 'Ik sta in een andere winkel' }}
                    </button>
                    <div v-if="isShowingOtherStores || step === 'unavailable'" class="other-stores">
                        <button
                            v-for="store in otherStores"
                            :key="store.identifier"
                            type="button"
                            class="store"
                            :disabled="isStarting"
                            @click="startIn(store)"
                        >
                            <span class="what">
                                <span class="name">{{ store.name }}</span>
                                <span v-if="store.place" class="place">{{ store.place }}</span>
                            </span>
                            <span class="start">Start</span>
                        </button>
                        <button v-if="step !== 'manual'" type="button" class="add" @click="addManually()">
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            Winkel handmatig toevoegen
                        </button>
                    </div>
                </template>
            </div>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/store-picker.css';
</style>
