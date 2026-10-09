<script setup lang="ts">
import { ref } from 'vue';
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
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();

const currentPassword = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const reset = (): void => {
    currentPassword.value = '';
    password.value = '';
    passwordConfirmation.value = '';
    errors.value = {};
};

const save = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        await profileApi.updatePassword(currentPassword.value, password.value, passwordConfirmation.value);
        open.value = false;
        await toast.success('Je wachtwoord is aangepast.');
    } catch (error) {
        password.value = '';
        passwordConfirmation.value = '';

        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        busy.value = false;
    }
};
</script>
<template>
    <ion-modal :is-open="open" @will-present="reset()" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>Wachtwoord wijzigen</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="description">Je blijft aangemeld op dit toestel.</p>
            <form @submit.prevent="save()">
                <ion-input
                    v-model="currentPassword"
                    type="password"
                    autocomplete="current-password"
                    label="Huidig wachtwoord"
                    label-placement="stacked"
                    fill="outline"
                    :class="{ 'ion-invalid ion-touched': errors.current_password }"
                    :error-text="errors.current_password?.[0]"
                ></ion-input>
                <ion-input
                    v-model="password"
                    type="password"
                    autocomplete="new-password"
                    label="Nieuw wachtwoord"
                    label-placement="stacked"
                    fill="outline"
                    :class="{ 'ion-invalid ion-touched': errors.password }"
                    :error-text="errors.password?.[0]"
                ></ion-input>
                <ion-input
                    v-model="passwordConfirmation"
                    type="password"
                    autocomplete="new-password"
                    label="Herhaal nieuw wachtwoord"
                    label-placement="stacked"
                    fill="outline"
                ></ion-input>
                <ion-button
                    type="submit"
                    expand="block"
                    :disabled="busy || currentPassword === '' || password === '' || passwordConfirmation === ''"
                >
                    <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                    <span v-else>Bewaren</span>
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
</style>
