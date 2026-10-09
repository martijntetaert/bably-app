<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { stores } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { StoreInterface } from '@/interfaces/StoreInterface';

type Confirmation = 'route' | 'store';

const props = defineProps<{
    store: StoreInterface | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const toast = useToast();

const name = ref('');
const place = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

const confirmation = ref<Confirmation | null>(null);
const isConfirming = ref(false);
const isProcessing = ref(false);

const routeMeta = computed(() => {
    if (!props.store || props.store.routeLength === 0) {
        return 'Nog niets geleerd. Bably leert de route bij je volgende bezoek.';
    }

    return `${props.store.routeLength} producten op hun plaats, uit ${props.store.tripsCount} ${
        props.store.tripsCount === 1 ? 'bezoek' : 'bezoeken'
    }.`;
});

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    errors.value = {};
    name.value = props.store?.name ?? '';
    place.value = props.store?.place ?? '';
});

const save = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};

    const trimmedPlace = place.value.trim() === '' ? null : place.value.trim();

    try {
        if (props.store) {
            await stores.update(props.store.identifier, name.value.trim(), trimmedPlace);
        } else {
            await stores.create({ name: name.value.trim(), place: trimmedPlace });
        }

        emit('changed');
        open.value = false;
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        processing.value = false;
    }
};

const ask = (subject: Confirmation): void => {
    confirmation.value = subject;
    isConfirming.value = true;
};

const confirm = async (): Promise<void> => {
    if (!props.store || !confirmation.value) {
        return;
    }

    const closesSheet = confirmation.value === 'store';
    isProcessing.value = true;

    try {
        if (closesSheet) {
            await stores.remove(props.store.identifier);
        } else {
            await stores.resetRoute(props.store.identifier);
        }

        emit('changed');
        isConfirming.value = false;

        if (closesSheet) {
            open.value = false;
        }
    } catch (error) {
        toast.failure(error);
    } finally {
        isProcessing.value = false;
    }
};
</script>
<template>
    <section class="section-portal-settings-edit-store">
        <drawer-component
            v-model:open="open"
            :title="store ? 'Winkel bewerken' : 'Winkel toevoegen'"
            :description="
                store
                    ? 'Bably herkent de winkel aan de plek waar je ze bewaarde.'
                    : 'Zonder locatie: je kiest deze winkel zelf als je begint.'
            "
        >
            <form-component class="form" @submit="save()">
                <div class="field">
                    <section-label-component>Naam</section-label-component>
                    <input-component v-model="name" name="store" placeholder="Colruyt" autocomplete="off" required />
                    <p v-if="errors.name" class="error">
                        {{ errors.name[0] }}
                    </p>
                </div>
                <div class="field">
                    <section-label-component>Plaats</section-label-component>
                    <input-component v-model="place" name="spot" placeholder="Straat, gemeente" autocomplete="off" />
                    <p v-if="errors.place" class="error">
                        {{ errors.place[0] }}
                    </p>
                </div>

                <div v-if="store" class="manage">
                    <div class="route">
                        <div class="what">
                            <span class="name">Geleerde route</span>
                            <span class="meta">{{ routeMeta }}</span>
                        </div>
                        <button v-if="store.routeLength > 0" type="button" class="wipe" @click="ask('route')">
                            Wissen
                        </button>
                    </div>
                    <button type="button" class="delete" @click="ask('store')">Winkel verwijderen</button>
                </div>

                <div class="actions">
                    <button-component type="submit" :disabled="processing || name.trim() === ''">
                        {{ store ? 'Bewaren' : 'Toevoegen' }}
                    </button-component>
                    <button-component variant="ghost" @click="open = false">Annuleren</button-component>
                </div>
            </form-component>
        </drawer-component>

        <confirm-dialog-component
            v-if="store"
            v-model:open="isConfirming"
            :title="confirmation === 'route' ? 'Route wissen?' : 'Winkel verwijderen?'"
            :description="
                confirmation === 'route'
                    ? `Bably vergeet waar alles staat in ${store.name} en leert het opnieuw.`
                    : `${store.name} en de geleerde route verdwijnen.`
            "
            :confirm-label="confirmation === 'route' ? 'Wissen' : 'Verwijderen'"
            :processing="isProcessing"
            @confirm="confirm()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/edit-store.css';
</style>
