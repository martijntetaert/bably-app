<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonToggle } from '@ionic/vue';
import { calendarOutline, copyOutline, refreshOutline, shareSocialOutline } from 'ionicons/icons';
import { Share } from '@capacitor/share';
import { profile as profileApi } from '@/api/bably';
import { useConfirm } from '@/composables/useConfirm';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
    calendarUrl: string | null;
}>();

const session = useSession();
const toast = useToast();
const confirm = useConfirm();

const isLinked = ref(props.calendarUrl !== null);
const isBusy = ref(false);

watch(
    () => props.calendarUrl,
    (url) => {
        isLinked.value = url !== null;
    },
);

const createLink = async (): Promise<void> => {
    isBusy.value = true;

    try {
        await profileApi.createCalendarLink();
        await session.refreshProfile();
    } catch (error) {
        isLinked.value = props.calendarUrl !== null;
        await toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};

const deleteLink = async (): Promise<void> => {
    const confirmed = await confirm(
        'Agenda loskoppelen?',
        'De agendalink stopt met werken: je agenda toont het menu en je taken niet meer.',
        'Loskoppelen',
    );

    if (!confirmed) {
        isLinked.value = true;

        return;
    }

    isBusy.value = true;

    try {
        await profileApi.deleteCalendarLink();
        await session.refreshProfile();
    } catch (error) {
        isLinked.value = true;
        await toast.failure(error);
    } finally {
        isBusy.value = false;
    }
};

const setLinked = (linked: boolean): void => {
    isLinked.value = linked;

    if (linked) {
        createLink();
    } else {
        deleteLink();
    }
};

const copyLink = async (): Promise<void> => {
    if (props.calendarUrl === null) {
        return;
    }

    try {
        await navigator.clipboard.writeText(props.calendarUrl);
        await toast.success('Link gekopieerd. Plak hem in je agenda bij "Abonneren".');
    } catch {
        await toast.info('Kopiëren lukte niet. Houd de link ingedrukt om hem te kopiëren.');
    }
};

const shareLink = async (): Promise<void> => {
    if (props.calendarUrl === null) {
        return;
    }

    try {
        await Share.share({ title: 'Bably-agenda', url: props.calendarUrl, dialogTitle: 'Agendalink delen' });
    } catch {
        // Closing the share sheet without choosing an app rejects; nothing went wrong.
    }
};
</script>
<template>
    <section class="integrations-component">
        <ion-list inset>
            <ion-list-header>
                <ion-label>Koppelingen</ion-label>
            </ion-list-header>
            <ion-item :lines="props.calendarUrl ? undefined : 'none'">
                <ion-icon slot="start" :icon="calendarOutline" aria-hidden="true"></ion-icon>
                <ion-toggle :checked="isLinked" :disabled="isBusy" @ion-change="setLinked($event.detail.checked)">
                    <ion-label>
                        <h3>Agenda</h3>
                        <p>
                            {{
                                props.calendarUrl
                                    ? 'Het menu en jouw taken staan in je agenda'
                                    : 'Zet het menu en jouw taken in Google, Apple of Outlook'
                            }}
                        </p>
                    </ion-label>
                </ion-toggle>
            </ion-item>
            <ion-item v-if="props.calendarUrl" lines="none">
                <div class="calendar-link">
                    <p class="url">{{ props.calendarUrl }}</p>
                    <div class="link-actions">
                        <ion-button size="small" @click="shareLink()">
                            <ion-icon slot="start" :icon="shareSocialOutline"></ion-icon>
                            Delen
                        </ion-button>
                        <ion-button size="small" fill="outline" @click="copyLink()">
                            <ion-icon slot="start" :icon="copyOutline"></ion-icon>
                            Kopiëren
                        </ion-button>
                        <ion-button size="small" fill="outline" :disabled="isBusy" @click="createLink()">
                            <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
                            Nieuwe link
                        </ion-button>
                    </div>
                    <p class="hint">
                        Je agenda haalt de link zelf op, meestal een paar keer per dag. Wie de link heeft, ziet je menu
                        en taken: deel hem niet. Een nieuwe link maakt de oude ongeldig.
                    </p>
                </div>
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

ion-icon[slot='start'] {
    color: var(--ion-color-primary);
}

.calendar-link {
    width: 100%;
    padding: 0.25rem 0 0.75rem;
}

.url {
    margin: 0 0 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.75rem;
    background: var(--bably-muted);
    color: var(--bably-muted-text);
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    word-break: break-all;
    user-select: all;
}

.link-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.link-actions ion-button {
    margin: 0;
}

.hint {
    margin: 0.75rem 0 0;
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}
</style>
