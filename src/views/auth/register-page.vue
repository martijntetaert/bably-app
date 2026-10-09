<script setup lang="ts">
import { reactive, ref } from 'vue';
import { IonButton, IonInput, IonSpinner, useIonRouter } from '@ionic/vue';
import { ApiError } from '@/api/client';
import AuthCardComponent from '@/components/auth-card-component.vue';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const session = useSession();
const toast = useToast();
const ionRouter = useIonRouter();

const form = reactive({ firstname: '', lastname: '', email: '', household: '', password: '', password_confirmation: '' });
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const submit = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        await session.register({ ...form, household: form.household || undefined });
        ionRouter.navigate('/verify-email', 'root', 'replace');
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

const fields: { key: keyof typeof form; label: string; type: string; autocomplete: string; helper?: string }[] = [
    { key: 'firstname', label: 'Voornaam', type: 'text', autocomplete: 'given-name' },
    { key: 'lastname', label: 'Achternaam', type: 'text', autocomplete: 'family-name' },
    { key: 'email', label: 'E-mailadres', type: 'email', autocomplete: 'email' },
    { key: 'household', label: 'Naam van je huishouden', type: 'text', autocomplete: 'off', helper: 'Leeg laten wordt "Gezin" en je achternaam.' },
    { key: 'password', label: 'Wachtwoord', type: 'password', autocomplete: 'new-password' },
    { key: 'password_confirmation', label: 'Herhaal je wachtwoord', type: 'password', autocomplete: 'new-password' },
];
</script>
<template>
    <auth-card-component subtitle="Start een huishouden in Bably">
        <form @submit.prevent="submit">
            <ion-input
                v-for="field in fields"
                :key="field.key"
                v-model="form[field.key]"
                :type="field.type as 'text'"
                :autocomplete="field.autocomplete as 'off'"
                :label="field.label"
                label-placement="stacked"
                fill="outline"
                :helper-text="field.helper"
                :class="{ 'ion-invalid ion-touched': errors[field.key] }"
                :error-text="errors[field.key]?.[0]"
            ></ion-input>
            <ion-button type="submit" expand="block" :disabled="busy">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                <span v-else>Account maken</span>
            </ion-button>
        </form>
        <div class="links">
            <router-link to="/login">Al een account? Meld je aan</router-link>
        </div>
    </auth-card-component>
</template>
