<script setup lang="ts">
import { ref } from 'vue';
import { Share } from '@capacitor/share';
import { profile as profileApi } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import ToggleComponent from '@/components/toggle-component.vue';

const props = defineProps<{
    calendarUrl: string | null;
}>();

const session = useSession();
const toast = useToast();

const isBusy = ref(false);
const isConfirmingUnlink = ref(false);

const createLink = async (): Promise<void> => {
    isBusy.value = true;

    try {
        await profileApi.createCalendarLink();
        await session.refreshProfile();
    } catch (error) {
        toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};

const deleteLink = async (): Promise<void> => {
    isBusy.value = true;

    try {
        await profileApi.deleteCalendarLink();
        await session.refreshProfile();
        isConfirmingUnlink.value = false;
    } catch (error) {
        toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};

const setLinked = (linked: boolean): void => {
    if (linked) {
        createLink();

        return;
    }

    isConfirmingUnlink.value = true;
};

const shareLink = async (): Promise<void> => {
    if (!props.calendarUrl) {
        return;
    }

    try {
        await Share.share({ title: 'Bably-agenda', url: props.calendarUrl, dialogTitle: 'Agendalink delen' });
    } catch {
        // Closing the share sheet without choosing an app rejects; nothing went wrong.
    }
};

const copyLink = async (): Promise<void> => {
    if (!props.calendarUrl) {
        return;
    }

    try {
        await navigator.clipboard.writeText(props.calendarUrl);
        toast.success('Link gekopieerd. Plak hem in je agenda bij "Abonneren".');
    } catch {
        toast.info('Kopiëren lukte niet. Houd de link ingedrukt om hem te kopiëren.');
    }
};
</script>
<template>
    <section class="section-portal-settings-integrations">
        <section-label-component class="label">Koppelingen</section-label-component>
        <list-group-component>
            <list-row-component
                title="Agenda"
                :meta="
                    calendarUrl
                        ? 'Het menu en jouw taken staan in je agenda'
                        : 'Zet het menu en jouw taken in Google, Apple of Outlook'
                "
                grouped
            >
                <template #leading>
                    <span class="badge">
                        <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                    </span>
                </template>
                <template #trailing>
                    <toggle-component
                        :model-value="calendarUrl !== null"
                        label="Agenda koppelen"
                        @update:model-value="setLinked($event)"
                    ></toggle-component>
                </template>
            </list-row-component>
            <div v-if="calendarUrl" class="calendar-link">
                <p class="url">{{ calendarUrl }}</p>
                <div class="link-actions">
                    <button type="button" class="primary" @click="shareLink()">
                        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
                        Delen
                    </button>
                    <button type="button" @click="copyLink()">
                        <i class="fa-regular fa-copy" aria-hidden="true"></i>
                        Kopiëren
                    </button>
                    <button type="button" :disabled="isBusy" @click="createLink()">
                        <i class="fa-solid fa-rotate" aria-hidden="true"></i>
                        Nieuwe link
                    </button>
                </div>
                <p class="hint">
                    Je agenda haalt de link zelf op, meestal een paar keer per dag. Wie de link heeft, ziet je menu en
                    taken: deel hem niet. Een nieuwe link maakt de oude ongeldig.
                </p>
            </div>
        </list-group-component>

        <confirm-dialog-component
            v-model:open="isConfirmingUnlink"
            title="Agenda loskoppelen?"
            description="De agendalink stopt met werken: je agenda toont het menu en je taken niet meer."
            confirm-label="Loskoppelen"
            :processing="isBusy"
            @confirm="deleteLink()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/integrations.css';
</style>
