<script setup lang="ts">
import { ref } from 'vue';
import { IonIcon, IonItem, IonLabel, IonList, IonListHeader, useIonRouter } from '@ionic/vue';
import { logOutOutline } from 'ionicons/icons';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { ProfileInterface } from '@/interfaces/ProfileInterface';
import AvatarComponent from '@/components/avatar-component.vue';
import ChangeEmailComponent from '@/views/settings/components/change-email-component.vue';
import ChangePasswordComponent from '@/views/settings/components/change-password-component.vue';
import DeleteAccountComponent from '@/views/settings/components/delete-account-component.vue';
import EditProfileComponent from '@/views/settings/components/edit-profile-component.vue';

const props = defineProps<{
    profile: ProfileInterface;
}>();

const session = useSession();
const push = usePush();
const ionRouter = useIonRouter();

const isEditing = ref(false);
const isChangingEmail = ref(false);
const isChangingPassword = ref(false);
const isDeletingAccount = ref(false);

const signOut = async (): Promise<void> => {
    await push.forget();
    await session.signOut();
    ionRouter.navigate('/login', 'root', 'replace');
};
</script>
<template>
    <section class="profile-component">
        <ion-list inset>
            <ion-list-header>
                <ion-label>Jij</ion-label>
            </ion-list-header>
            <ion-item button detail @click="isEditing = true">
                <avatar-component
                    slot="start"
                    :name="props.profile.user.firstname"
                    :photo-url="props.profile.user.photoUrl"
                ></avatar-component>
                <ion-label>
                    <h3>{{ props.profile.user.name }}</h3>
                    <p>{{ props.profile.user.email }}</p>
                </ion-label>
            </ion-item>
            <ion-item button detail @click="isChangingEmail = true">
                <ion-label>
                    <h3>E-mailadres wijzigen</h3>
                    <p v-if="props.profile.user.pendingEmail">
                        Wacht op bevestiging van {{ props.profile.user.pendingEmail }}
                    </p>
                </ion-label>
            </ion-item>
            <ion-item button detail @click="isChangingPassword = true">
                <ion-label>Wachtwoord wijzigen</ion-label>
            </ion-item>
            <ion-item button @click="signOut()">
                <ion-label>Afmelden</ion-label>
                <ion-icon slot="end" :icon="logOutOutline" aria-hidden="true"></ion-icon>
            </ion-item>
            <ion-item button lines="none" @click="isDeletingAccount = true">
                <ion-label color="danger">Account verwijderen</ion-label>
            </ion-item>
        </ion-list>

        <edit-profile-component v-model:open="isEditing"></edit-profile-component>
        <change-email-component
            v-model:open="isChangingEmail"
            :email="props.profile.user.email"
        ></change-email-component>
        <change-password-component v-model:open="isChangingPassword"></change-password-component>
        <delete-account-component
            v-model:open="isDeletingAccount"
            :is-last-member="props.profile.isLastMember"
        ></delete-account-component>
    </section>
</template>
<style scoped>
h3 {
    margin: 0;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0;
}

ion-icon {
    color: var(--bably-muted-text);
}
</style>
