<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonInput, IonSpinner, useIonRouter } from '@ionic/vue';
import { ApiError } from '@/api/client';
import AuthCardComponent from '@/components/auth-card-component.vue';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const session = useSession();
const push = usePush();
const toast = useToast();
const ionRouter = useIonRouter();

const email = ref('');
const password = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const submit = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        await session.signIn(email.value, password.value);

        if (session.isVerified.value) {
            await push.enable();
        }

        ionRouter.navigate(session.isVerified.value ? '/tabs/dashboard' : '/verify-email', 'root', 'replace');
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
    <auth-card-component subtitle="Meld je aan om verder te gaan">
        <form @submit.prevent="submit">
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
            <ion-input
                v-model="password"
                type="password"
                autocomplete="current-password"
                label="Wachtwoord"
                label-placement="stacked"
                fill="outline"
                :class="{ 'ion-invalid ion-touched': errors.password }"
                :error-text="errors.password?.[0]"
            ></ion-input>
            <ion-button type="submit" expand="block" :disabled="busy">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                <span v-else>Aanmelden</span>
            </ion-button>
        </form>
        <div class="links">
            <router-link to="/forgot-password">Wachtwoord vergeten?</router-link>
            <router-link to="/register">Nog geen account? Maak er een</router-link>
        </div>
    </auth-card-component>
</template>
