<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
} from '@ionic/vue';
import { stores } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { StoreInterface } from '@/interfaces/StoreInterface';

const props = defineProps<{
    store: StoreInterface | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const toast = useToast();
const confirm = useConfirm();

const name = ref('');
const place = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const routeMeta = computed(() => {
    if (props.store === null || props.store.routeLength === 0) {
        return 'Nog niets geleerd. Bably leert de route bij je volgende bezoek.';
    }

    return `${props.store.routeLength} producten op hun plaats, uit ${props.store.tripsCount} ${props.store.tripsCount === 1 ? 'bezoek' : 'bezoeken'}.`;
});

const fill = (): void => {
    name.value = props.store?.name ?? '';
    place.value = props.store?.place ?? '';
    errors.value = {};
};

const save = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    const trimmedPlace = place.value.trim() === '' ? null : place.value.trim();

    try {
        if (props.store === null) {
            await stores.create({ name: name.value.trim(), place: trimmedPlace });
        } else {
            await stores.update(props.store.identifier, name.value.trim(), trimmedPlace);
        }

        emit('changed');
        open.value = false;
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        busy.value = false;
    }
};

const resetRoute = async (): Promise<void> => {
    if (props.store === null) {
        return;
    }

    const confirmed = await confirm(
        'Route wissen?',
        `Bably vergeet waar alles staat in ${props.store.name} en leert het opnieuw.`,
        'Wissen',
    );

    if (!confirmed) {
        return;
    }

    try {
        await stores.resetRoute(props.store.identifier);
        emit('changed');
    } catch (error) {
        await toast.failure(error);
    }
};

const remove = async (): Promise<void> => {
    if (props.store === null) {
        return;
    }

    const confirmed = await confirm('Winkel verwijderen?', `${props.store.name} en de geleerde route verdwijnen.`);

    if (!confirmed) {
        return;
    }

    try {
        await stores.remove(props.store.identifier);
        emit('changed');
        open.value = false;
    } catch (error) {
        await toast.failure(error);
    }
};
</script>
<template>
    <ion-modal :is-open="open" @will-present="fill()" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>{{ props.store ? 'Winkel bewerken' : 'Winkel toevoegen' }}</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="description">
                {{
                    props.store
                        ? 'Bably herkent de winkel aan de plek waar je ze bewaarde.'
                        : 'Zonder locatie: je kiest deze winkel zelf als je begint.'
                }}
            </p>
            <form @submit.prevent="save()">
                <ion-input
                    v-model="name"
                    label="Naam"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="Colruyt"
                    autocomplete="off"
                    autocapitalize="sentences"
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
                    :class="{ 'ion-invalid ion-touched': errors.place }"
                    :error-text="errors.place?.[0]"
                ></ion-input>

                <div v-if="props.store" class="manage">
                    <div class="route">
                        <div class="what">
                            <span class="name">Geleerde route</span>
                            <span class="meta">{{ routeMeta }}</span>
                        </div>
                        <ion-button
                            v-if="props.store.routeLength > 0"
                            fill="clear"
                            size="small"
                            color="danger"
                            @click="resetRoute()"
                        >
                            Wissen
                        </ion-button>
                    </div>
                    <ion-button fill="clear" color="danger" class="delete" @click="remove()">
                        Winkel verwijderen
                    </ion-button>
                </div>

                <ion-button type="submit" expand="block" :disabled="busy || name.trim() === ''">
                    <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                    <span v-else>{{ props.store ? 'Bewaren' : 'Toevoegen' }}</span>
                </ion-button>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.description {
    margin: 0 0 1.25rem;
    color: var(--bably-muted-text);
}

form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.manage {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
}

.route {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-muted);
}

.what {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
}

.name {
    font-weight: 600;
}

.meta {
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}

.delete {
    margin: 0;
}
</style>
