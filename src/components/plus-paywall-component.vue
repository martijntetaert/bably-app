<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Browser } from '@capacitor/browser';
import ButtonComponent from '@/components/button-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import { formatDate } from '@/composables/useDateTime';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { buyPlus, manageSubscriptionUrl, PlusOffer, plusOffers, restorePlus, sellsPlus } from '@/lib/purchases';

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();

const offers = ref<PlusOffer[]>([]);
const isLoadingOffers = ref(false);
const isBuying = ref(false);

const plus = computed(() => session.profile.value?.plus ?? null);

const perks = [
    { icon: 'fa-solid fa-route', title: 'Je looproute', text: 'De lijst volgt de winkel, en Bably herkent waar je bent.' },
    { icon: 'fa-solid fa-box-open', title: 'Voorraad', text: 'Wat bijna op is, staat vanzelf op de lijst.' },
    { icon: 'fa-solid fa-book-open', title: 'Alle recepten', text: 'Onbeperkt bewaren en overnemen van een link.' },
    { icon: 'fa-solid fa-stopwatch', title: 'Kookmodus', text: 'Stap voor stap, met timers die afgaan.' },
    { icon: 'fa-solid fa-chart-simple', title: 'Overzicht en agenda', text: 'Wie wat deed, en je taken in je agenda.' },
];

const description = computed(() => {
    if (plus.value?.reason === 'trial' && plus.value.endsAt !== null) {
        return `Je huishouden probeert Plus gratis tot ${formatDate(plus.value.endsAt)}.`;
    }

    if (plus.value?.active) {
        return plus.value.endsAt === null
            ? 'Je huishouden heeft Plus.'
            : `Je huishouden heeft Plus tot ${formatDate(plus.value.endsAt)}.`;
    }

    return 'Eén abonnement voor heel je huishouden.';
});

const hasSubscription = computed(() => plus.value?.reason === 'play_store');

const loadOffers = async (): Promise<void> => {
    if (!sellsPlus || plus.value === null || hasSubscription.value) {
        return;
    }

    isLoadingOffers.value = true;

    try {
        offers.value = await plusOffers(plus.value.householdIdentifier);
    } catch {
        offers.value = [];
    } finally {
        isLoadingOffers.value = false;
    }
};

watch(open, (isOpen) => {
    if (isOpen) {
        void loadOffers();
    }
});

/**
 * The store tells the server through a webhook, which can take a moment; the profile is
 * asked again until it has caught up.
 */
const waitForPlus = async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 6; attempt++) {
        const profile = await session.refreshProfile().catch(() => null);

        if (profile?.plus?.active === true && profile.plus.reason !== 'trial') {
            return true;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }

    return false;
};

const buy = async (offer: PlusOffer): Promise<void> => {
    if (plus.value === null) {
        return;
    }

    isBuying.value = true;

    try {
        if (!(await buyPlus(plus.value.householdIdentifier, offer))) {
            return;
        }

        open.value = false;
        toast.success(
            (await waitForPlus())
                ? 'Welkom bij Bably Plus. Heel je huishouden kan er nu mee aan de slag.'
                : 'Bedankt! Plus staat zo meteen klaar.',
        );
    } catch (error) {
        toast.failure(error);
    } finally {
        isBuying.value = false;
    }
};

const restore = async (): Promise<void> => {
    if (plus.value === null) {
        return;
    }

    isBuying.value = true;

    try {
        await restorePlus(plus.value.householdIdentifier);
        toast.info((await waitForPlus()) ? 'Plus is terug.' : 'Er is geen abonnement gevonden om terug te zetten.');
    } catch (error) {
        toast.failure(error);
    } finally {
        isBuying.value = false;
    }
};

const manage = async (): Promise<void> => {
    await Browser.open({ url: manageSubscriptionUrl });
};
</script>
<template>
    <section class="component-plus-paywall-component">
        <drawer-component v-model:open="open" title="Bably Plus" :description="description">
            <div class="paywall">
                <ul class="perks">
                    <li v-for="perk in perks" :key="perk.title">
                        <span class="perk-icon"><i :class="perk.icon" aria-hidden="true"></i></span>
                        <span class="perk-text">
                            <strong>{{ perk.title }}</strong>
                            <span>{{ perk.text }}</span>
                        </span>
                    </li>
                </ul>

                <template v-if="hasSubscription">
                    <button-component variant="secondary" @click="manage()">Abonnement beheren</button-component>
                </template>
                <template v-else-if="sellsPlus">
                    <p v-if="isLoadingOffers" class="note">Prijzen ophalen…</p>
                    <p v-else-if="offers.length === 0" class="note">
                        Plus is nu niet te koop. Probeer het straks opnieuw.
                    </p>
                    <div v-else class="offers">
                        <button-component
                            v-for="offer in offers"
                            :key="offer.package.identifier"
                            :variant="offer.package.packageType === 'ANNUAL' ? 'primary' : 'soft'"
                            :disabled="isBuying"
                            @click="buy(offer)"
                        >
                            {{ offer.label }} · {{ offer.price }}
                        </button-component>
                    </div>
                    <button-component variant="ghost" :disabled="isBuying" @click="restore()">
                        Aankoop terugzetten
                    </button-component>
                </template>
                <p v-else-if="!plus?.active" class="note">Plus neem je voorlopig in de Android-app van Bably.</p>
            </div>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/components/plus-paywall-component.css';
</style>
