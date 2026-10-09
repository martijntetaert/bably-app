<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { household } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { HouseholdInterface } from '@/interfaces/HouseholdInterface';

const props = defineProps<{
    name: string;
}>();

const emit = defineEmits<{
    renamed: [household: HouseholdInterface];
}>();

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();

const draftName = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        draftName.value = props.name;
        error.value = null;
    }
});

const save = async (): Promise<void> => {
    if (draftName.value.trim() === '' || busy.value) {
        return;
    }

    busy.value = true;
    error.value = null;

    try {
        emit('renamed', await household.rename(draftName.value.trim()));
        open.value = false;
    } catch (exception) {
        if (exception instanceof ApiError && exception.status === 422) {
            error.value = exception.firstError('name') ?? exception.message;
        } else {
            await toast.failure(exception);
        }
    } finally {
        busy.value = false;
    }
};
</script>
<template>
    <ion-modal :is-open="open" :initial-breakpoint="0.5" :breakpoints="[0, 0.5, 0.9]" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>Naam van het huishouden</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" :disabled="busy || draftName.trim() === ''" @click="save">
                        <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                        <span v-else>Bewaren</span>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <form @submit.prevent="save">
                <p class="description">Staat bovenaan Huis en in de uitnodigingen.</p>
                <ion-input
                    v-model="draftName"
                    label="Naam"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="Gezin Tetaert"
                    :maxlength="60"
                    autocapitalize="words"
                    :class="{ 'ion-invalid ion-touched': error }"
                    :error-text="error ?? undefined"
                ></ion-input>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.description {
    margin: 0 0 1rem;
    color: var(--bably-muted-text);
}
</style>
