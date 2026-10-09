<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    alertController,
    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSkeletonText,
    IonSpinner,
    IonToggle,
    useIonRouter,
} from '@ionic/vue';
import { Share } from '@capacitor/share';
import { close, exitOutline, pencil } from '@/lib/icons';
import { household } from '@/api/bably';
import { ApiError, apiUrl } from '@/api/client';
import { useConfirm } from '@/composables/useConfirm';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { HouseholdInvitationInterface } from '@/interfaces/HouseholdInvitationInterface';
import { HouseholdOverviewInterface } from '@/interfaces/HouseholdOverviewInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import HouseholdNameComponent from '@/views/household/components/household-name-component.vue';
import AvatarComponent from '@/components/avatar-component.vue';

const session = useSession();
const toast = useToast();
const confirm = useConfirm();
const ionRouter = useIonRouter();

const overview = ref<HouseholdOverviewInterface | null>(null);
const isRenaming = ref(false);
const inviteEmail = ref('');
const inviteError = ref<string | null>(null);
const isInviting = ref(false);

const memberCount = computed(() => overview.value?.members.length ?? 0);

const refresh = async (): Promise<void> => {
    try {
        overview.value = await household.show();
    } catch (error) {
        await toast.failure(error);
    }
};

const isYou = (member: UserInterface): boolean => member.identifier === session.user.value?.identifier;

const memberMeta = (member: UserInterface): string => {
    if (isYou(member)) {
        return 'Dat ben jij';
    }

    const count = member.openTaskCount ?? 0;

    return `${count} ${count === 1 ? 'taak' : 'taken'} open`;
};

const removeMember = async (member: UserInterface): Promise<void> => {
    const confirmed = await confirm(
        `${member.firstname} uit het huishouden halen?`,
        `${member.firstname} ziet jullie lijst, menu en taken niet meer. Open taken van ${member.firstname} komen bij jou.`,
        'Uit het huishouden',
    );

    if (!confirmed) {
        return;
    }

    try {
        await household.removeMember(member.identifier);
        await refresh();
    } catch (error) {
        await toast.failure(error);
    }
};

const cancelInvitation = async (invitation: HouseholdInvitationInterface): Promise<void> => {
    const confirmed = await confirm('Uitnodiging intrekken?', `De link die ${invitation.email} kreeg, werkt dan niet meer.`, 'Intrekken');

    if (!confirmed) {
        return;
    }

    try {
        await household.cancelInvitation(invitation.identifier);
        await refresh();
    } catch (error) {
        await toast.failure(error);
    }
};

/**
 * The server mails the link itself; sharing sends it again through a channel the other
 * person actually reads.
 */
const offerToShare = async ({ email, identifier }: HouseholdInvitationInterface): Promise<void> => {
    if (!(await Share.canShare()).value) {
        await toast.success(`Uitnodiging verstuurd naar ${email}.`);

        return;
    }

    const alert = await alertController.create({
        header: 'Uitnodiging verstuurd',
        message: `${email} krijgt een mail met de link. Laat je het ook zelf even weten?`,
        buttons: [
            { text: 'Niet nu', role: 'cancel' },
            { text: 'Delen', role: 'confirm' },
        ],
    });

    await alert.present();

    if ((await alert.onDidDismiss()).role !== 'confirm') {
        return;
    }

    const name = overview.value?.household.name ?? 'ons huishouden';

    await Share.share({
        title: `Uitnodiging voor ${name}`,
        text: `Ik heb je uitgenodigd voor ${name} op Bably, zodat we samen de boodschappen, het eten en de taken bijhouden.`,
        url: `${apiUrl}/invitations/${identifier}`,
        dialogTitle: 'Uitnodiging delen',
    }).catch(() => undefined);
};

const invite = async (): Promise<void> => {
    const email = inviteEmail.value.trim();

    if (email === '' || isInviting.value) {
        return;
    }

    isInviting.value = true;
    inviteError.value = null;

    try {
        const invitation = await household.invite(email);
        inviteEmail.value = '';
        await refresh();
        await offerToShare(invitation);
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            inviteError.value = error.firstError('email') ?? error.message;
        } else {
            await toast.failure(error);
        }
    } finally {
        isInviting.value = false;
    }
};

const setFollowsAlongLive = async (followsAlongLive: boolean): Promise<void> => {
    if (overview.value === null) {
        return;
    }

    const previous = overview.value.household;
    overview.value.household = { ...previous, followsAlongLive };

    try {
        overview.value.household = await household.followAlongLive(followsAlongLive);
    } catch (error) {
        overview.value.household = previous;
        await toast.failure(error);
    }
};

const leave = async (): Promise<void> => {
    const name = overview.value?.household.name ?? '';
    const confirmed = await confirm(
        `${name} verlaten?`,
        'Je ziet de lijst, het menu en de taken van dit huishouden niet meer. Je open taken gaan naar een ander lid. Terugkomen kan enkel met een nieuwe uitnodiging.',
        'Verlaten',
    );

    if (!confirmed) {
        return;
    }

    try {
        await household.leave();
        await session.refreshProfile().catch(() => undefined);
        ionRouter.navigate('/tabs/dashboard', 'root', 'replace');
    } catch (error) {
        await toast.failure(error);
    }
};

defineExpose({ refresh });

void refresh();
</script>
<template>
    <div class="members">
        <div v-if="overview === null" class="skeleton">
            <ion-skeleton-text :animated="true" class="title"></ion-skeleton-text>
            <ion-skeleton-text v-for="row in 3" :key="row" :animated="true" class="row"></ion-skeleton-text>
        </div>

        <template v-else>
            <button type="button" class="name" aria-label="Naam van het huishouden wijzigen" @click="isRenaming = true">
                <span class="display">{{ overview.household.name }}</span>
                <i :class="pencil" aria-hidden="true"></i>
                <span class="count">{{ memberCount }} {{ memberCount === 1 ? 'lid' : 'leden' }}</span>
            </button>

            <ion-list class="card" lines="full">
                <ion-item v-for="member in overview.members" :key="member.identifier">
                    <avatar-component slot="start" :name="member.firstname" :photo="member.photoUrl"></avatar-component>
                    <ion-label>
                        <h3>{{ member.name }}</h3>
                        <p>{{ memberMeta(member) }}</p>
                    </ion-label>
                    <ion-button
                        v-if="!isYou(member)"
                        slot="end"
                        fill="clear"
                        color="medium"
                        :aria-label="`${member.name} uit het huishouden halen`"
                        @click="removeMember(member)"
                    >
                        <i slot="icon-only" :class="close" aria-hidden="true"></i>
                    </ion-button>
                </ion-item>
                <ion-item v-for="invitation in overview.invitations" :key="invitation.identifier" class="is-pending">
                    <avatar-component slot="start" :name="invitation.email" pending></avatar-component>
                    <ion-label>
                        <h3>{{ invitation.email }}</h3>
                        <p>Uitnodiging verstuurd</p>
                    </ion-label>
                    <ion-button
                        slot="end"
                        fill="clear"
                        color="medium"
                        :aria-label="`Uitnodiging voor ${invitation.email} intrekken`"
                        @click="cancelInvitation(invitation)"
                    >
                        <i slot="icon-only" :class="close" aria-hidden="true"></i>
                    </ion-button>
                </ion-item>
            </ion-list>

            <section>
                <h2 class="label">Iemand uitnodigen</h2>
                <form class="invite" @submit.prevent="invite">
                    <ion-input
                        v-model="inviteEmail"
                        class="input"
                        type="email"
                        inputmode="email"
                        autocomplete="off"
                        placeholder="e-mailadres"
                        aria-label="E-mailadres"
                        enterkeyhint="send"
                        fill="outline"
                        :class="{ 'ion-invalid ion-touched': inviteError }"
                        :error-text="inviteError ?? undefined"
                    ></ion-input>
                    <ion-button type="submit" :disabled="isInviting || inviteEmail.trim() === ''">
                        <ion-spinner v-if="isInviting" name="crescent"></ion-spinner>
                        <span v-else>Uitnodigen</span>
                    </ion-button>
                </form>
            </section>

            <ion-list class="card" lines="full">
                <ion-list-header>
                    <h2 class="label">Afspraken</h2>
                </ion-list-header>
                <ion-item>
                    <ion-toggle
                        :checked="overview.household.followsAlongLive"
                        @ion-change="setFollowsAlongLive($event.detail.checked)"
                    >
                        <ion-label>
                            <h3>Live meelopen in de winkel</h3>
                            <p>Afvinken is meteen zichtbaar voor de anderen</p>
                        </ion-label>
                    </ion-toggle>
                </ion-item>
                <ion-item v-if="memberCount > 1" button :detail="false" @click="leave">
                    <i slot="start" :class="exitOutline" aria-hidden="true"></i>
                    <ion-label color="danger">Huishouden verlaten</ion-label>
                </ion-item>
            </ion-list>
        </template>

        <household-name-component
            v-if="overview"
            v-model:open="isRenaming"
            :name="overview.household.name"
            @renamed="overview.household = $event"
        ></household-name-component>
    </div>
</template>
<style scoped>
.members {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.skeleton .title {
    width: 60%;
    height: 2rem;
}

.skeleton .row {
    height: 3.75rem;
    border-radius: var(--bably-radius-row);
}

.name {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0 0.25rem;
    border: 0;
    background: none;
    color: var(--ion-text-color);
    font: inherit;
    text-align: start;
}

.name .display {
    font-size: 1.5rem;
    font-weight: 700;
}

.name i {
    color: var(--bably-muted-text);
    font-size: 1rem;
}

.name .count {
    flex-basis: 100%;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.card {
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
}

.card ion-item {
    --background: var(--bably-card);
    --border-color: var(--bably-border);
    --min-height: 3.75rem;
}

.card ion-item:last-child {
    --border-width: 0;
    --inner-border-width: 0;
}

.card h3 {
    font-weight: 600;
}

.card ion-list-header {
    --background: var(--bably-card);
}

.is-pending h3 {
    color: var(--bably-muted-text);
}

.label {
    margin: 0 0 0.5rem;
    padding: 0 0.25rem;
    color: var(--bably-muted-text);
    font-family: var(--ion-font-family);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

ion-list-header .label {
    margin: 0.5rem 0 0;
    padding: 0;
}

.invite {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.invite .input {
    flex: 1;
    --background: var(--bably-card);
}

.invite ion-button {
    height: 3.5rem;
    margin: 0;
}
</style>
