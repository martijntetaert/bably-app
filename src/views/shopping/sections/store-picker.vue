<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import PlaceSearchComponent from '@/components/form/place-search-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { shopping, StoreFields, stores as storesApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { usePlus } from '@/composables/usePlus';
import { useToast } from '@/composables/useToast';
import { NearbyPlaceInterface } from '@/interfaces/NearbyPlaceInterface';
import { PlaceSuggestionInterface } from '@/interfaces/PlaceSuggestionInterface';
import { StoreInterface } from '@/interfaces/StoreInterface';
import { newSessionToken } from '@/lib/sessionToken';

type Step = 'locating' | 'known' | 'unknown' | 'manual' | 'unavailable' | 'choose';

const props = defineProps<{
    stores: StoreInterface[];
}>();

const emit = defineEmits<{
    started: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();
const { hasPlus } = usePlus();
const step = ref<Step>('locating');
const recognisedStore = ref<StoreInterface | null>(null);
const isShowingOtherStores = ref(false);
const isStarting = ref(false);
const isSaving = ref(false);
const name = ref('');
const place = ref('');
const position = ref<{ latitude: number; longitude: number } | null>(null);
// Only biases the Google search; a store added by hand keeps no coordinates.
const searchNear = ref<{ latitude: number; longitude: number } | null>(null);
const googlePlace = ref<PlaceSuggestionInterface | null>(null);
const sessionToken = ref(newSessionToken());
const errors = ref<Record<string, string[]>>({});
const nearbyPlaces = ref<NearbyPlaceInterface[]>([]);
const isLoadingNearby = ref(false);
const isTypingOwnStore = ref(false);

// Without stores nearby the form shows at once, as it did before.
const showsNearby = computed(
    () => step.value === 'unknown' && !isTypingOwnStore.value && (isLoadingNearby.value || nearbyPlaces.value.length > 0)
);

const title = computed(() => {
    switch (step.value) {
        case 'locating':
            return 'Bably kijkt waar je bent';
        case 'known':
            return recognisedStore.value?.name ?? '';
        case 'unknown':
            return showsNearby.value ? 'Sta je in een van deze winkels?' : 'Welke winkel is dit?';
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
            return showsNearby.value
                ? 'Bably kent deze plek nog niet. Tik je winkel aan en ze wordt volgende keer herkend.'
                : 'Bably kent deze plek nog niet. Geef ze een naam en ze wordt volgende keer herkend.';
        case 'manual':
            return 'Zonder locatie: je kiest deze winkel zelf als je begint.';
        case 'choose':
            return 'Kies de winkel waar je bent.';
        default:
            return 'Je locatie is niet beschikbaar. Kies de winkel zelf.';
    }
});

const isPicking = computed(() => step.value === 'unavailable' || step.value === 'choose');

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

const findNearby = async (latitude: number, longitude: number): Promise<void> => {
    isLoadingNearby.value = true;

    try {
        nearbyPlaces.value = await storesApi.nearby(latitude, longitude);
    } catch {
        nearbyPlaces.value = [];
    } finally {
        isLoadingNearby.value = false;
    }
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
        searchNear.value = position.value;
        step.value = store ? 'known' : 'unknown';

        if (!store) {
            void findNearby(coords.latitude, coords.longitude);
        }
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
    searchNear.value = null;
    googlePlace.value = null;
    sessionToken.value = newSessionToken();
    errors.value = {};
    nearbyPlaces.value = [];
    isLoadingNearby.value = false;
    isTypingOwnStore.value = false;

    // Recognising the store is Plus; without it you simply pick one.
    if (hasPlus.value) {
        void locate();
    } else {
        step.value = 'choose';
    }
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

const fillAddress = (suggestion: PlaceSuggestionInterface): void => {
    place.value = suggestion.address ?? place.value;
};

const createAndStart = async (fields: StoreFields): Promise<void> => {
    isSaving.value = true;
    errors.value = {};

    try {
        const store = await storesApi.create(fields);
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

const saveAndStart = (): Promise<void> =>
    createAndStart({
        name: name.value.trim(),
        place: place.value.trim() === '' ? null : place.value.trim(),
        latitude: position.value?.latitude ?? null,
        longitude: position.value?.longitude ?? null,
        startShopping: true,
        googlePlaceId: googlePlace.value?.googlePlaceId ?? null,
        sessionToken: sessionToken.value,
    });

// The server already holds what it found nearby, so no session token is needed.
const startInNearby = (nearby: NearbyPlaceInterface): Promise<void> =>
    createAndStart({
        name: nearby.name,
        place: nearby.address,
        latitude: position.value?.latitude ?? null,
        longitude: position.value?.longitude ?? null,
        startShopping: true,
        googlePlaceId: nearby.googlePlaceId,
    });

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

                <template v-else-if="showsNearby">
                    <div v-if="isLoadingNearby" class="nearby" aria-busy="true">
                        <span v-for="row in 3" :key="row" class="skeleton"></span>
                    </div>
                    <div v-else class="nearby">
                        <button
                            v-for="nearby in nearbyPlaces"
                            :key="nearby.googlePlaceId"
                            type="button"
                            class="store"
                            :disabled="isSaving"
                            @click="startInNearby(nearby)"
                        >
                            <span class="what">
                                <span class="name">{{ nearby.name }}</span>
                                <span v-if="nearby.address" class="place">{{ nearby.address }}</span>
                            </span>
                            <span class="distance">{{ Math.round(nearby.distanceMeters) }} m</span>
                        </button>
                        <p v-if="errors.name || errors.googlePlaceId" class="error">
                            {{ (errors.name ?? errors.googlePlaceId)[0] }}
                        </p>
                    </div>
                    <button type="button" class="toggle-other" @click="isTypingOwnStore = true">
                        Andere winkel? Typ ze zelf
                    </button>
                </template>

                <form-component
                    v-else-if="step === 'unknown' || step === 'manual'"
                    class="form"
                    @submit="saveAndStart()"
                >
                    <div class="field">
                        <section-label-component>Naam</section-label-component>
                        <place-search-component
                            v-model="name"
                            v-model:place="googlePlace"
                            :session-token="sessionToken"
                            :near="searchNear"
                            name="store"
                            placeholder="Colruyt"
                            required
                            @picked="fillAddress"
                        />
                        <p v-if="errors.name" class="error">
                            {{ errors.name[0] }}
                        </p>
                        <p v-else-if="errors.googlePlaceId" class="error">
                            {{ errors.googlePlaceId[0] }}
                        </p>
                        <p v-else class="hint">
                            Kies je winkel uit de lijst, dan gebruikt Bably ook de route van andere Bably-gebruikers in
                            die winkel.
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
                        v-if="!isPicking"
                        type="button"
                        class="toggle-other"
                        :aria-expanded="isShowingOtherStores"
                        @click="isShowingOtherStores = !isShowingOtherStores"
                    >
                        {{ isShowingOtherStores ? 'Andere winkels verbergen' : 'Ik sta in een andere winkel' }}
                    </button>
                    <div v-if="isShowingOtherStores || isPicking" class="other-stores">
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
