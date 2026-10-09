<script setup lang="ts">
import { ref } from 'vue';
import UsersHeader from '@/views/household/users/sections/users-header.vue';
import HouseholdNavigation from '@/views/household/sections/household-navigation.vue';
import MembersList from '@/views/household/users/sections/members-list.vue';
import InviteMember from '@/views/household/users/sections/invite-member.vue';
import Agreements from '@/views/household/users/sections/agreements.vue';
import { household } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { HouseholdInterface } from '@/interfaces/HouseholdInterface';
import { HouseholdOverviewInterface } from '@/interfaces/HouseholdOverviewInterface';

const toast = useToast();

const overview = ref<HouseholdOverviewInterface | null>(null);

const refresh = async (): Promise<void> => {
    try {
        overview.value = await household.show();
    } catch (error) {
        toast.failure(error);
    }
};

const updateHousehold = (changed: HouseholdInterface): void => {
    if (overview.value) {
        overview.value.household = changed;
    }
};

defineExpose({ refresh });

void refresh();
</script>
<template>
    <div id="page-portal-household-users-overview">
        <users-header
            :name="overview?.household.name ?? null"
            :member-count="overview?.members.length ?? 0"
            @renamed="refresh()"
        ></users-header>
        <household-navigation></household-navigation>
        <template v-if="overview">
            <members-list
                :members="overview.members"
                :invitations="overview.invitations"
                @changed="refresh()"
            ></members-list>
            <invite-member :household-name="overview.household.name" @invited="refresh()"></invite-member>
            <agreements
                :household="overview.household"
                :member-count="overview.members.length"
                @updated="updateHousehold"
            ></agreements>
        </template>
    </div>
</template>
<style scoped>
@import '@css/pages/portal/household/users/overview.css';
</style>
