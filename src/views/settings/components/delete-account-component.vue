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
    useIonRouter,
} from '@ionic/vue';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
    isLastMember: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const push = usePush();
const toast = useToast();
const ionRouter = useIonRouter();

const currentPassword = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const reset = (): void => {
    currentPassword.value = '';
    errors.value = {};
};

const destroy = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        await profileApi.deleteAccount(currentPassword.value);
        open.value = false;
        await push.forget();
        await session.forget();
        ionRouter.navigate('/login', 'root', 'replace');
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
                <ion-title>Account verwijderen?</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="description">Dit kan je niet ongedaan maken.</p>
            <p class="warning">
                {{
                    props.isLastMember
                        ? 'Je bent de laatste in dit huishouden: de lijst, het menu, de recepten, de voorraad en de taken verdwijnen mee.'
                        : 'Je verdwijnt uit het huishouden. Je open taken gaan naar een ander lid; de rest blijft voor hen.'
                }}
            </p>
            <form @submit.prevent="destroy()">
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
                <ion-button type="submit" expand="block" color="danger" :disabled="busy || currentPassword === ''">
                    <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                    <span v-else>Account verwijderen</span>
                </ion-button>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.description {
    margin: 0 0 1rem;
    color: var(--bably-muted-text);
}

.warning {
    margin: 0 0 1.25rem;
    padding: 0.875rem 1rem;
    border-radius: var(--bably-radius-row);
    background: rgba(var(--ion-color-danger-rgb), 0.1);
    color: var(--ion-color-danger);
    font-size: 0.9375rem;
}

form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>
