<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonButton, IonInput, IonModal, IonSpinner } from '@ionic/vue';
import { Geolocation } from '@capacitor/geolocation';
import { add, chevronForward, locationOutline } from '@/lib/icons';
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

    if (store === null || store.routeLength === 0) {
        return 'Nog geen route. Vink af terwijl je loopt: Bably leert waar alles staat.';
    }

    return `Bably kent hier de plaats van ${store.routeLength} producten, geleerd uit ${store.tripsCount} ${store.tripsCount === 1 ? 'bezoek' : 'bezoeken'}.`;
});

const otherStores = computed(() => props.stores.filter((store) => store.identifier !== recognisedStore.value?.identifier));

const locate = async (): Promise<void> => {
    try {
        const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
        const { store } = await storesApi.recognize(coords.latitude, coords.longitude);

        position.value = { latitude: coords.latitude, longitude: coords.longitude };
        recognisedStore.value = store;
        step.value = store === null ? 'unknown' : 'known';
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
        await toast.success(`Op de route van ${store.name}. Vink af terwijl je loopt.`);
        open.value = false;
        emit('started');
    } catch (error) {
        await toast.failure(error);
    } finally {
        isStarting.value = false;
    }
};

const addManually = (): void => {
    position.value = null;
    step.value = 'manual';
};

const saveAndStart = async (): Promise<void> => {
    isStarting.value = true;
    errors.value = {};

    try {
        const store = await storesApi.create({
            name: name.value.trim(),
            place: place.value.trim() === '' ? null : place.value.trim(),
            latitude: position.value?.latitude ?? null,
            longitude: position.value?.longitude ?? null,
            startShopping: true,
        });
        await toast.success(`${store.name} bewaard. Vink af terwijl je loopt: Bably leert de route.`);
        open.value = false;
        emit('started');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        isStarting.value = false;
    }
};
</script>
<template>
    <ion-modal :is-open="open" class="sheet" :initial-breakpoint="1" :breakpoints="[0, 1]" @did-dismiss="open = false">
        <div class="sheet-body">
            <h2>{{ title }}</h2>
            <p class="description">{{ description }}</p>

            <div v-if="step === 'locating'" class="locating" aria-live="polite">
                <span class="pin"><i :class="locationOutline" aria-hidden="true"></i></span>
            </div>

            <template v-else-if="step === 'known' && recognisedStore">
                <p class="route">{{ routeMeta }}</p>
                <ion-button expand="block" class="primary" :disabled="isStarting" @click="startIn(recognisedStore)">
                    <ion-spinner v-if="isStarting" name="crescent"></ion-spinner>
                    <span v-else>Hier winkelen</span>
                </ion-button>
            </template>

            <form v-else-if="step === 'unknown' || step === 'manual'" class="form" @submit.prevent="saveAndStart()">
                <ion-input
                    v-model="name"
                    label="Naam"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="Colruyt"
                    autocomplete="off"
                    :class="{ 'ion-invalid ion-touched': errors.name }"
                    :error-text="errors.name?.[0]"
                ></ion-input>
                <ion-input
                    v-model="place"
                    label="Plaats"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="Straat, gemeente"
                    autocomplete="off"
                    :class="{ 'ion-invalid ion-touched': errors.place || errors.latitude }"
                    :error-text="errors.place?.[0] ?? errors.latitude?.[0]"
                ></ion-input>
                <ion-button type="submit" expand="block" class="primary" :disabled="isStarting || name.trim() === ''">
                    <ion-spinner v-if="isStarting" name="crescent"></ion-spinner>
                    <span v-else>Opslaan en beginnen</span>
                </ion-button>
            </form>

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
                        <i :class="chevronForward" aria-hidden="true"></i>
                    </button>
                    <button v-if="step !== 'manual'" type="button" class="add" @click="addManually()">
                        <i :class="add" aria-hidden="true"></i>
                        Winkel handmatig toevoegen
                    </button>
                </div>
            </template>
        </div>
    </ion-modal>
</template>
<style scoped>
.sheet {
    --height: auto;
    --border-radius: var(--bably-radius-card);
}

.sheet :deep(.ion-delegate-host) {
    position: relative;
    display: block;
    contain: content;
}

.sheet-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 85vh;
    overflow-y: auto;
    padding: 1rem 1rem calc(1.25rem + var(--ion-safe-area-bottom, 0px));
}

h2 {
    margin: 0.5rem 0 0;
    font-size: 1.25rem;
}

.description,
.route {
    margin: 0;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.locating {
    display: flex;
    justify-content: center;
    padding: 1.5rem 0;
}

.pin {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
    font-size: 1.75rem;
    animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
    50% {
        transform: scale(1.12);
        opacity: 0.7;
    }
}

.form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.primary {
    --border-radius: 0.875rem;
    min-height: 3rem;
    margin: 0;
}

.toggle-other {
    align-self: center;
    padding: 0.5rem;
    background: transparent;
    color: var(--ion-color-primary);
    font-size: 0.875rem;
    font-weight: 600;
}

.other-stores {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.store,
.add {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    min-height: 3.25rem;
    padding: 0.5rem 0.75rem 0.5rem 0.875rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
    color: var(--ion-text-color);
    text-align: start;
}

.what {
    display: flex;
    flex: 1;
    flex-direction: column;
}

.name {
    font-weight: 600;
}

.place {
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}

.start {
    color: var(--ion-color-primary);
    font-size: 0.875rem;
    font-weight: 600;
}

.add {
    border-style: dashed;
    color: var(--bably-muted-text);
    font-weight: 600;
}
</style>
