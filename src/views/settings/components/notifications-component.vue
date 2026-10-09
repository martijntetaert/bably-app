<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { IonItem, IonLabel, IonList, IonListHeader, IonToggle } from '@ionic/vue';
import { checkboxOutline, notificationsOutline } from '@/lib/icons';
import { profile as profileApi } from '@/api/bably';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
    wantsTaskReminder: boolean;
}>();

const push = usePush();
const session = useSession();
const toast = useToast();

const isEnabled = ref(false);
const isBlocked = ref(false);
const isBusy = ref(false);
const wantsReminder = ref(props.wantsTaskReminder);

watch(
    () => props.wantsTaskReminder,
    (wanted) => {
        wantsReminder.value = wanted;
    },
);

const meta = computed(() => {
    if (!push.isAvailable) {
        return 'Meldingen werken alleen in de app op je toestel.';
    }

    if (isBlocked.value) {
        return 'Meldingen staan uit voor Bably in de instellingen van je toestel.';
    }

    return isEnabled.value
        ? 'Aan: als iemand gaat winkelen, en je taken van de dag.'
        : 'Krijg een melding als iemand gaat winkelen.';
});

onMounted(async () => {
    isEnabled.value = await push.isEnabled();
});

const togglePush = async (wanted: boolean): Promise<void> => {
    if (isBusy.value) {
        return;
    }

    isBusy.value = true;
    isEnabled.value = wanted;

    try {
        if (wanted) {
            const allowed = await push.enable();
            isEnabled.value = allowed;
            isBlocked.value = !allowed;
        } else {
            await push.disable();
        }
    } catch (error) {
        isEnabled.value = !wanted;
        await toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};

const setTaskReminder = async (wanted: boolean): Promise<void> => {
    wantsReminder.value = wanted;

    try {
        await profileApi.updateTaskReminder(wanted);
        await session.refreshProfile().catch(() => undefined);
    } catch (error) {
        wantsReminder.value = !wanted;
        await toast.failure(error);
    }
};
</script>
<template>
    <section class="notifications-component">
        <ion-list inset>
            <ion-list-header>
                <ion-label>Meldingen</ion-label>
            </ion-list-header>
            <ion-item :lines="isEnabled ? undefined : 'none'">
                <i slot="start" :class="notificationsOutline" aria-hidden="true"></i>
                <ion-toggle
                    v-if="push.isAvailable"
                    :checked="isEnabled"
                    :disabled="isBusy"
                    @ion-change="togglePush($event.detail.checked)"
                >
                    <ion-label>
                        <h3>Meldingen op dit toestel</h3>
                        <p>{{ meta }}</p>
                    </ion-label>
                </ion-toggle>
                <ion-label v-else>
                    <h3>Meldingen op dit toestel</h3>
                    <p>{{ meta }}</p>
                </ion-label>
            </ion-item>
            <ion-item v-if="isEnabled" lines="none">
                <i slot="start" :class="checkboxOutline" aria-hidden="true"></i>
                <ion-toggle :checked="wantsReminder" @ion-change="setTaskReminder($event.detail.checked)">
                    <ion-label>
                        <h3>Taken 's ochtends</h3>
                        <p>Om 8 uur wat jij vandaag te doen hebt</p>
                    </ion-label>
                </ion-toggle>
            </ion-item>
        </ion-list>
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

p {
    white-space: normal;
}

i {
    color: var(--ion-color-primary);
}
</style>
