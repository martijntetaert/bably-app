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
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
    email: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();

const newEmail = ref('');
const currentPassword = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const reset = (): void => {
    newEmail.value = '';
    currentPassword.value = '';
    errors.value = {};
};

const save = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        const email = newEmail.value.trim();
        await profileApi.updateEmail(email, currentPassword.value);
        await session.refreshProfile().catch(() => undefined);
        open.value = false;
        await toast.success(`Kijk in de mailbox van ${email} om het te bevestigen.`);
    } catch (error) {
        currentPassword.value = '';

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
                <ion-title>E-mailadres wijzigen</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="description">
                Nu meld je je aan met {{ props.email }}. Het nieuwe adres telt pas als je het bevestigt vanuit die
                mailbox.
            </p>
            <form @submit.prevent="save()">
                <ion-input
                    v-model="newEmail"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    label="Nieuw e-mailadres"
                    label-placement="stacked"
                    fill="outline"
                    :class="{ 'ion-invalid ion-touched': errors.email }"
                    :error-text="errors.email?.[0]"
                ></ion-input>
                <ion-input
                    v-model="currentPassword"
                    type="password"
                    autocomplete="current-password"
                    label="Je wachtwoord"
                    label-placement="stacked"
                    fill="outline"
                    :class="{ 'ion-invalid ion-touched': errors.current_password }"
                    :error-text="errors.current_password?.[0]"
                ></ion-input>
                <ion-button
                    type="submit"
                    expand="block"
                    :disabled="busy || newEmail.trim() === '' || currentPassword === ''"
                >
                    <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                    <span v-else>Stuur bevestiging</span>
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
