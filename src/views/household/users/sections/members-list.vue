<script setup lang="ts">
import { ref } from 'vue';
import AvatarComponent from '@/components/avatar-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { household } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { UserInterface } from '@/interfaces/UserInterface';
import { HouseholdInvitationInterface } from '@/interfaces/HouseholdInvitationInterface';

const props = defineProps<{
    members: UserInterface[];
    invitations: HouseholdInvitationInterface[];
}>();

const emit = defineEmits<{
    changed: [];
}>();

const session = useSession();
const toast = useToast();

const invitationToWithdraw = ref<HouseholdInvitationInterface | null>(null);
const isConfirmOpen = ref(false);
const isWithdrawing = ref(false);

const memberToRemove = ref<UserInterface | null>(null);
const isRemoveOpen = ref(false);
const isRemoving = ref(false);

const isYou = (member: UserInterface): boolean => member.email === session.user.value?.email;

const askToRemove = (member: UserInterface): void => {
    memberToRemove.value = member;
    isRemoveOpen.value = true;
};

const remove = async (): Promise<void> => {
    if (!memberToRemove.value) {
        return;
    }

    isRemoving.value = true;

    try {
        await household.removeMember(memberToRemove.value.identifier);
        isRemoveOpen.value = false;
        emit('changed');
    } catch (error) {
        toast.failure(error);
    } finally {
        isRemoving.value = false;
    }
};

const memberMeta = (member: UserInterface): string => {
    if (isYou(member)) {
        return 'Dat ben jij';
    }

    const count = member.openTaskCount ?? 0;

    return `${count} ${count === 1 ? 'taak' : 'taken'} open`;
};

const askToWithdraw = (invitation: HouseholdInvitationInterface): void => {
    invitationToWithdraw.value = invitation;
    isConfirmOpen.value = true;
};

const withdraw = async (): Promise<void> => {
    if (!invitationToWithdraw.value) {
        return;
    }

    isWithdrawing.value = true;

    try {
        await household.cancelInvitation(invitationToWithdraw.value.identifier);
        isConfirmOpen.value = false;
        emit('changed');
    } catch (error) {
        toast.failure(error);
    } finally {
        isWithdrawing.value = false;
    }
};
</script>
<template>
    <section class="section-portal-household-users-members-list">
        <list-group-component>
            <list-row-component
                v-for="member in props.members"
                :key="member.identifier"
                :title="member.name"
                :meta="memberMeta(member)"
                grouped
            >
                <template #leading>
                    <avatar-component :name="member.firstname" :photo="member.photoUrl"></avatar-component>
                </template>
                <template v-if="!isYou(member)" #trailing>
                    <button
                        type="button"
                        class="withdraw"
                        :aria-label="`${member.name} uit het huishouden halen`"
                        @click="askToRemove(member)"
                    >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </template>
            </list-row-component>
            <list-row-component
                v-for="invitation in props.invitations"
                :key="invitation.identifier"
                :title="invitation.email"
                class="is-pending"
                meta="Uitnodiging verstuurd"
                grouped
            >
                <template #leading>
                    <avatar-component :name="invitation.email" pending></avatar-component>
                </template>
                <template #trailing>
                    <button
                        type="button"
                        class="withdraw"
                        :aria-label="`Uitnodiging voor ${invitation.email} intrekken`"
                        @click="askToWithdraw(invitation)"
                    >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </template>
            </list-row-component>
        </list-group-component>

        <confirm-dialog-component
            v-model:open="isRemoveOpen"
            :title="`${memberToRemove?.firstname ?? ''} uit het huishouden halen?`"
            :description="`${memberToRemove?.firstname ?? ''} ziet jullie lijst, menu en taken niet meer. Open taken van ${memberToRemove?.firstname ?? ''} komen bij jou.`"
            confirm-label="Uit het huishouden"
            :processing="isRemoving"
            @confirm="remove()"
        />

        <confirm-dialog-component
            v-model:open="isConfirmOpen"
            title="Uitnodiging intrekken?"
            :description="`De link die ${invitationToWithdraw?.email ?? ''} kreeg, werkt dan niet meer.`"
            confirm-label="Intrekken"
            :processing="isWithdrawing"
            @confirm="withdraw()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/users/sections/members-list.css';
</style>
