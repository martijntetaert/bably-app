<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { profile as profileApi } from '@/api/bably';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import ToggleComponent from '@/components/toggle-component.vue';

type Availability = 'checking' | 'available' | 'unavailable' | 'blocked';

const props = defineProps<{
    wantsTaskReminder: boolean;
}>();

const push = usePush();
const session = useSession();
const toast = useToast();

const availability = ref<Availability>('checking');
const isEnabled = ref(false);
const isBusy = ref(false);
const wantsReminder = ref(props.wantsTaskReminder);

watch(
    () => props.wantsTaskReminder,
    (wanted) => {
        wantsReminder.value = wanted;
    }
);

const setTaskReminder = async (wanted: boolean): Promise<void> => {
    wantsReminder.value = wanted;

    try {
        await profileApi.updateTaskReminder(wanted);
        await session.refreshProfile().catch(() => undefined);
    } catch (error) {
        wantsReminder.value = !wanted;
        toast.failure(error);
    }
};

const meta = computed(() => {
    switch (availability.value) {
        case 'unavailable':
            return 'Meldingen werken alleen in de app op je toestel.';
        case 'blocked':
            return 'Meldingen staan uit voor Bably in de instellingen van je toestel.';
        default:
            return isEnabled.value
                ? 'Aan: als iemand gaat winkelen, en je taken van de dag.'
                : 'Krijg een melding als iemand gaat winkelen.';
    }
});

const hasToggle = computed(() => availability.value === 'available' || availability.value === 'blocked');

onMounted(async () => {
    if (!push.isAvailable) {
        availability.value = 'unavailable';

        return;
    }

    isEnabled.value = await push.isEnabled();
    availability.value = 'available';
});

const toggle = async (wanted: boolean): Promise<void> => {
    if (isBusy.value) {
        return;
    }

    isBusy.value = true;
    isEnabled.value = wanted;

    try {
        if (wanted) {
            const allowed = await push.enable();
            isEnabled.value = allowed;
            availability.value = allowed ? 'available' : 'blocked';
        } else {
            await push.disable();
        }
    } catch (error) {
        isEnabled.value = !wanted;
        toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};
</script>
<template>
    <section class="section-portal-settings-notifications">
        <section-label-component class="label">Meldingen</section-label-component>
        <list-row-component title="Meldingen op dit toestel" :meta="meta">
            <template #leading>
                <span class="badge">
                    <i class="fa-solid fa-bell" aria-hidden="true"></i>
                </span>
            </template>
            <template v-if="hasToggle" #trailing>
                <toggle-component
                    :model-value="isEnabled"
                    label="Meldingen op dit toestel"
                    @update:model-value="toggle"
                ></toggle-component>
            </template>
        </list-row-component>
        <list-row-component
            v-if="availability === 'available' && isEnabled"
            title="Taken 's ochtends"
            meta="Om 8 uur wat jij vandaag te doen hebt"
            class="reminder"
        >
            <template #leading>
                <span class="badge">
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                </span>
            </template>
            <template #trailing>
                <toggle-component
                    :model-value="wantsReminder"
                    label="Taken 's ochtends"
                    @update:model-value="setTaskReminder"
                ></toggle-component>
            </template>
        </list-row-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/notifications.css';
</style>
