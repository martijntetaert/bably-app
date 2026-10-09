<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonInput, IonSpinner } from '@ionic/vue';
import { auth } from '@/api/bably';
import { ApiError } from '@/api/client';
import AuthCardComponent from '@/components/auth-card-component.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const email = ref('');
const errors = ref<Record<string, string[]>>({});
const status = ref<string | null>(null);
const busy = ref(false);

const submit = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        status.value = (await auth.forgotPassword(email.value)).status;
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
</script>
<template>
    <auth-card-component subtitle="We mailen je een link om een nieuw wachtwoord te kiezen">
        <p v-if="status" class="status">{{ status }}</p>
        <form v-else @submit.prevent="submit">
            <ion-input
                v-model="email"
                type="email"
                inputmode="email"
                autocomplete="email"
                label="E-mailadres"
                label-placement="stacked"
                fill="outline"
                :class="{ 'ion-invalid ion-touched': errors.email }"
                :error-text="errors.email?.[0]"
            ></ion-input>
            <ion-button type="submit" expand="block" :disabled="busy">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                <span v-else>Stuur de link</span>
            </ion-button>
        </form>
        <div class="links">
            <router-link to="/login">Terug naar aanmelden</router-link>
        </div>
    </auth-card-component>
</template>
<style scoped>
.status {
    background: var(--bably-accent-soft);
    border-radius: var(--bably-radius-row);
    padding: 1rem;
}
</style>
