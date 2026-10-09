<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, useIonRouter } from '@ionic/vue';
import { auth } from '@/api/bably';
import AuthCardComponent from '@/components/auth-card-component.vue';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const session = useSession();
const push = usePush();
const toast = useToast();
const ionRouter = useIonRouter();
const busy = ref(false);

/**
 * The link in the mail opens in the browser, so the app asks the server whether it was
 * followed.
 */
const check = async (): Promise<void> => {
    busy.value = true;

    try {
        await session.refreshProfile();

        if (session.isVerified.value) {
            await push.enable();
            ionRouter.navigate('/tabs/dashboard', 'root', 'replace');
        } else {
            await toast.info('Je adres is nog niet bevestigd. Kijk in je mailbox.');
        }
    } catch (error) {
        await toast.failure(error);
    } finally {
        busy.value = false;
    }
};

const resend = async (): Promise<void> => {
    try {
        await auth.resendVerification();
        await toast.success('We stuurden een nieuwe link.');
    } catch (error) {
        await toast.failure(error);
    }
};

const signOut = async (): Promise<void> => {
    await session.signOut();
    ionRouter.navigate('/login', 'root', 'replace');
};
</script>
<template>
    <auth-card-component subtitle="Bevestig je e-mailadres">
        <p>
            We stuurden een link naar <strong>{{ session.user.value?.email }}</strong
            >. Open hem en kom dan terug.
        </p>
        <ion-button expand="block" :disabled="busy" @click="check">Ik heb bevestigd</ion-button>
        <ion-button expand="block" fill="clear" @click="resend">Stuur de link opnieuw</ion-button>
        <div class="links">
            <a href="#" @click.prevent="signOut">Afmelden</a>
        </div>
    </auth-card-component>
</template>
