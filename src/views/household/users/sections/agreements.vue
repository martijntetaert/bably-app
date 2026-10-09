<script setup lang="ts">
import { ref } from 'vue';
import { useIonRouter } from '@ionic/vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import ToggleComponent from '@/components/toggle-component.vue';
import { household as householdApi } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { HouseholdInterface } from '@/interfaces/HouseholdInterface';

const props = defineProps<{
    household: HouseholdInterface;
    memberCount: number;
}>();

const emit = defineEmits<{
    updated: [household: HouseholdInterface];
}>();

const session = useSession();
const toast = useToast();
const ionRouter = useIonRouter();

const isLeaveOpen = ref(false);
const isLeaving = ref(false);

const leave = async (): Promise<void> => {
    isLeaving.value = true;

    try {
        await householdApi.leave();
        isLeaveOpen.value = false;
        await session.refreshProfile().catch(() => undefined);
        ionRouter.navigate('/tabs/dashboard', 'root', 'replace');
    } catch (error) {
        toast.failure(error);
    } finally {
        isLeaving.value = false;
    }
};

const setFollowsAlongLive = async (followsAlongLive: boolean): Promise<void> => {
    const previous = props.household;

    emit('updated', { ...previous, followsAlongLive });

    try {
        emit('updated', await householdApi.followAlongLive(followsAlongLive));
    } catch (error) {
        emit('updated', previous);
        toast.failure(error);
    }
};
</script>
<template>
    <section class="section-portal-household-users-agreements">
        <section-label-component class="label">Afspraken</section-label-component>
        <list-group-component>
            <list-row-component
                title="Live meelopen in de winkel"
                meta="Afvinken is meteen zichtbaar voor de anderen"
                grouped
            >
                <template #trailing>
                    <toggle-component
                        :model-value="household.followsAlongLive"
                        label="Live meelopen in de winkel"
                        @update:model-value="setFollowsAlongLive($event)"
                    ></toggle-component>
                </template>
            </list-row-component>
            <list-row-component v-if="memberCount > 1" grouped clickable @click="isLeaveOpen = true">
                <template #title>
                    <span class="leave">Huishouden verlaten</span>
                </template>
            </list-row-component>
        </list-group-component>

        <confirm-dialog-component
            v-model:open="isLeaveOpen"
            :title="`${household.name} verlaten?`"
            description="Je ziet de lijst, het menu en de taken van dit huishouden niet meer. Je open taken gaan naar een ander lid. Terugkomen kan enkel met een nieuwe uitnodiging."
            confirm-label="Verlaten"
            :processing="isLeaving"
            @confirm="leave()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/users/sections/agreements.css';
</style>
