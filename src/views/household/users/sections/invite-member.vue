<script setup lang="ts">
import { ref } from 'vue';
import { Share } from '@capacitor/share';
import ButtonComponent from '@/components/button-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { household } from '@/api/bably';
import { apiUrl } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { HouseholdInvitationInterface } from '@/interfaces/HouseholdInvitationInterface';
import { useSubmission } from '@/views/household/composables/useSubmission';

const props = defineProps<{
    householdName: string;
}>();

const emit = defineEmits<{
    invited: [];
}>();

const toast = useToast();
const { processing, errors, submit } = useSubmission();

const email = ref('');
const invitationToShare = ref<HouseholdInvitationInterface | null>(null);
const isShareOpen = ref(false);

/**
 * The server mails the link itself; sharing sends it again through a channel the other
 * person actually reads.
 */
const offerToShare = async (invitation: HouseholdInvitationInterface): Promise<void> => {
    if (!(await Share.canShare()).value) {
        toast.success(`Uitnodiging verstuurd naar ${invitation.email}.`);

        return;
    }

    invitationToShare.value = invitation;
    isShareOpen.value = true;
};

const share = async (): Promise<void> => {
    isShareOpen.value = false;

    if (!invitationToShare.value) {
        return;
    }

    await Share.share({
        title: `Uitnodiging voor ${props.householdName}`,
        text: `Ik heb je uitgenodigd voor ${props.householdName} op Bably, zodat we samen de boodschappen, het eten en de taken bijhouden.`,
        url: `${apiUrl}/invitations/${invitationToShare.value.identifier}`,
        dialogTitle: 'Uitnodiging delen',
    }).catch(() => undefined);
};

const invite = async (): Promise<void> => {
    const sent: { invitation?: HouseholdInvitationInterface } = {};

    await submit(async () => {
        sent.invitation = await household.invite(email.value.trim());
    });

    if (sent.invitation) {
        email.value = '';
        emit('invited');
        await offerToShare(sent.invitation);
    }
};
</script>
<template>
    <section class="section-portal-household-users-invite-member">
        <section-label-component class="label">Iemand uitnodigen</section-label-component>
        <form-component class="form" @submit="invite()">
            <input-component
                v-model="email"
                class="input"
                type="email"
                name="email"
                placeholder="e-mailadres"
                autocomplete="off"
                required
            />
            <button-component type="submit" :disabled="processing"> Uitnodigen </button-component>
        </form-component>
        <p v-if="errors.email" class="error">
            {{ errors.email }}
        </p>

        <confirm-dialog-component
            v-model:open="isShareOpen"
            title="Uitnodiging verstuurd"
            :description="`${invitationToShare?.email ?? ''} krijgt een mail met de link. Laat je het ook zelf even weten?`"
            confirm-label="Delen"
            @confirm="share()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/users/sections/invite-member.css';
</style>
