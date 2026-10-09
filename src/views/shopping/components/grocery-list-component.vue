<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    alertController,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    actionSheetController,
    toastController,
} from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
    arrowUndoOutline,
    basketOutline,
    checkmarkCircle,
    chevronDown,
    chevronUp,
    cloudOfflineOutline,
    ellipseOutline,
    ellipsisVertical,
    eyeOffOutline,
    notificationsOutline,
    pencil,
    trashOutline,
} from '@/lib/icons';
import { shopping as shoppingApi } from '@/api/bably';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';
import ItemNoteComponent from '@/views/shopping/components/item-note-component.vue';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';

const props = defineProps<{
    groups: GroceryGroupInterface[];
    trip: ShoppingTripInterface | null;
}>();

const emit = defineEmits<{
    changed: [];
}>();

const toast = useToast();
const confirm = useConfirm();
const { pendingCount, isOnline, setChecked: queueCheck } = useOfflineChecks();

const isShopping = computed(() => props.trip !== null);
const isBasketOpen = ref(false);
const itemWithNote = ref<GroceryItemInterface | null>(null);
const isNoteOpen = ref(false);
let basketToast: HTMLIonToastElement | null = null;

const groupHint = (group: GroceryGroupInterface): string => {
    if (group.key === 'unplaced') {
        return 'Bably leert waar ze staan';
    }

    if (group.key === 'missing') {
        return 'Blijven op de lijst';
    }

    if (isShopping.value) {
        return `${group.items.filter((item) => !item.checked).length} te gaan`;
    }

    return `${group.items.length} ${group.items.length === 1 ? 'product' : 'producten'}`;
};

const visibleGroups = computed(() =>
    isShopping.value
        ? props.groups
              .map((group) => ({ ...group, items: group.items.filter((item) => !item.checked) }))
              .filter((group) => group.items.length > 0)
        : props.groups,
);

const basket = computed(() => (isShopping.value ? props.groups.flatMap((group) => group.items.filter((item) => item.checked)) : []));

const waitingMessage = computed(() => {
    const ticks = `${pendingCount.value} ${pendingCount.value === 1 ? 'vinkje wacht' : 'vinkjes wachten'}`;

    return `Geen bereik: ${ticks}. Bably stuurt ze zodra je weer verbinding hebt.`;
});

// What someone else asked for while you were already in the store.
const askedFor = (item: GroceryItemInterface): string | null => {
    const trip = props.trip;

    if (
        trip === null ||
        item.addedBy === null ||
        item.addedBy.identifier === trip.startedBy?.identifier ||
        Date.parse(item.addedBy.addedAt) < Date.parse(trip.startedAt)
    ) {
        return null;
    }

    return item.addedBy.firstname;
};

const setChecked = (item: GroceryItemInterface, checked: boolean): void => {
    item.identifiers.forEach((identifier) => queueCheck(identifier, checked));
};

// In the store a tick moves the product out of sight into the basket, so a mistap gets a way back.
const tick = async (item: GroceryItemInterface): Promise<void> => {
    const checked = !item.checked;
    setChecked(item, checked);
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);

    if (!isShopping.value || !checked) {
        return;
    }

    await basketToast?.dismiss().catch(() => undefined);
    basketToast = await toastController.create({
        message: `${item.name} in je mandje`,
        duration: 5000,
        position: 'top',
        buttons: [{ text: 'Ongedaan maken', handler: () => setChecked(item, false) }],
    });
    await basketToast.present();
};

const run = async (requests: Promise<unknown>[], message?: string): Promise<void> => {
    try {
        await Promise.all(requests);

        if (message !== undefined) {
            await toast.success(message);
        }
    } catch (error) {
        await toast.failure(error);
    } finally {
        emit('changed');
    }
};

const setMissing = (item: GroceryItemInterface, missing: boolean): Promise<void> =>
    run(item.identifiers.map((identifier) => shoppingApi.markMissing(identifier, missing)));

const remove = (item: GroceryItemInterface): Promise<void> => run(item.identifiers.map((identifier) => shoppingApi.remove(identifier)));

// Something the menu put on the list but that is always in the house goes to the staples,
// so the next dish with it does not put it back.
const markAsStaple = (item: GroceryItemInterface): Promise<void> =>
    run([shoppingApi.setStaple(item.productIdentifier, true)], `${item.name} staat in je basisvoorraad. Het menu zet het niet meer op de lijst.`);

const askToRemoveWithStaple = (item: GroceryItemInterface): Promise<'remove' | 'staple' | null> =>
    new Promise((resolve) => {
        alertController
            .create({
                header: 'Van de lijst halen?',
                message: `${item.name} verdwijnt van de boodschappenlijst.`,
                buttons: [
                    { text: 'Zit in mijn voorraad, niet meer op de lijst zetten', handler: () => resolve('staple') },
                    { text: 'Annuleren', role: 'cancel', handler: () => resolve(null) },
                    { text: 'Van de lijst', role: 'destructive', handler: () => resolve('remove') },
                ],
            })
            .then((alert) => {
                alert.onDidDismiss().then(({ role }) => {
                    if (role === 'backdrop') {
                        resolve(null);
                    }
                });
                alert.present();
            });
    });

const askToRemove = async (item: GroceryItemInterface): Promise<void> => {
    if (item.reason !== null) {
        const choice = await askToRemoveWithStaple(item);

        if (choice === 'remove') {
            await remove(item);
        } else if (choice === 'staple') {
            await markAsStaple(item);
        }

        return;
    }

    if (await confirm('Van de lijst halen?', `${item.name} verdwijnt van de boodschappenlijst.`, 'Van de lijst')) {
        await remove(item);
    }
};

const openNote = (item: GroceryItemInterface): void => {
    itemWithNote.value = item;
    isNoteOpen.value = true;
};

const openActions = async (item: GroceryItemInterface): Promise<void> => {
    const sheet = await actionSheetController.create({
        header: item.name,
        buttons: [
            { text: item.note ? 'Notitie aanpassen' : 'Notitie schrijven', handler: () => openNote(item) },
            { text: 'Van de lijst halen', role: 'destructive', handler: () => void askToRemove(item) },
            { text: 'Annuleren', role: 'cancel' },
        ],
    });
    await sheet.present();
};

const closeAndRun = async (event: Event, action: () => unknown): Promise<void> => {
    await ((event.target as HTMLElement).closest('ion-item-sliding') as HTMLIonItemSlidingElement | null)?.close();
    action();
};
</script>
<template>
    <section class="grocery-list" :class="{ 'is-shopping': isShopping }">
        <p v-if="pendingCount > 0 && !isOnline" class="waiting" role="status">
            <i :class="cloudOfflineOutline" aria-hidden="true"></i>
            {{ waitingMessage }}
        </p>
        <div v-for="group in visibleGroups" :key="group.key" class="group" :class="`group-${group.key}`">
            <div class="group-header">
                <h2>{{ group.name }}</h2>
                <span>{{ groupHint(group) }}</span>
            </div>
            <ion-list lines="none" class="rows">
                <ion-item-sliding v-for="item in group.items" :key="item.identifier">
                    <ion-item
                        button
                        :detail="false"
                        class="row"
                        :class="{ 'is-checked': item.checked, 'is-missing': item.missing }"
                        role="checkbox"
                        :aria-checked="item.checked"
                        @click="tick(item)"
                    >
                        <i slot="start" class="check" :class="item.checked ? checkmarkCircle : ellipseOutline" aria-hidden="true"></i>
                        <ion-label>
                            <span class="name">{{ item.name }}</span>
                            <span v-if="item.note || item.reason || askedFor(item)" class="meta">
                                <span v-if="askedFor(item)" class="asked">
                                    <i :class="notificationsOutline" aria-hidden="true"></i>
                                    Nieuw · {{ askedFor(item) }}
                                </span>
                                <span v-if="item.reason">{{ item.reason }}</span>
                                <span v-if="item.note" class="note">
                                    <i :class="pencil" aria-hidden="true"></i>
                                    {{ item.note }}
                                </span>
                            </span>
                        </ion-label>
                        <span v-if="item.quantity" slot="end" class="quantity">{{ item.quantity }}</span>
                        <button
                            v-if="isShopping"
                            slot="end"
                            type="button"
                            class="icon-button"
                            :class="{ 'is-active': item.missing }"
                            :aria-label="item.missing ? `${item.name} toch gevonden` : `${item.name} niet gevonden`"
                            @click.stop="setMissing(item, !item.missing)"
                        >
                            <i :class="item.missing ? arrowUndoOutline : eyeOffOutline" aria-hidden="true"></i>
                        </button>
                        <button
                            v-else
                            slot="end"
                            type="button"
                            class="icon-button"
                            :aria-label="`Acties voor ${item.name}`"
                            @click.stop="openActions(item)"
                        >
                            <i :class="ellipsisVertical" aria-hidden="true"></i>
                        </button>
                    </ion-item>
                    <ion-item-options v-if="!isShopping" side="end">
                        <ion-item-option color="medium" @click="closeAndRun($event, () => openNote(item))">
                            <i slot="icon-only" :class="pencil" :aria-label="`Notitie bij ${item.name}`" aria-hidden="true"></i>
                        </ion-item-option>
                        <ion-item-option color="danger" @click="closeAndRun($event, () => askToRemove(item))">
                            <i slot="icon-only" :class="trashOutline" :aria-label="`${item.name} van de lijst halen`" aria-hidden="true"></i>
                        </ion-item-option>
                    </ion-item-options>
                </ion-item-sliding>
            </ion-list>
        </div>
        <div v-if="basket.length > 0" class="basket">
            <button type="button" class="basket-toggle" :aria-expanded="isBasketOpen" @click="isBasketOpen = !isBasketOpen">
                <i :class="basketOutline" aria-hidden="true"></i>
                <span>In je mandje ({{ basket.length }})</span>
                <i :class="isBasketOpen ? chevronUp : chevronDown" aria-hidden="true"></i>
            </button>
            <ion-list v-if="isBasketOpen" lines="none" class="rows">
                <ion-item
                    v-for="item in basket"
                    :key="item.identifier"
                    button
                    :detail="false"
                    class="row is-checked"
                    role="checkbox"
                    :aria-checked="true"
                    @click="tick(item)"
                >
                    <i slot="start" class="check" :class="checkmarkCircle" aria-hidden="true"></i>
                    <ion-label><span class="name">{{ item.name }}</span></ion-label>
                    <span v-if="item.quantity" slot="end" class="quantity">{{ item.quantity }}</span>
                </ion-item>
            </ion-list>
        </div>
        <p v-if="groups.length === 0" class="empty">Je lijst is leeg. Zet hieronder iets op de lijst.</p>
        <p v-else class="hint">
            {{
                isShopping
                    ? 'Vink af terwijl je loopt. Bably onthoudt per product waar het in deze winkel staat.'
                    : 'In de winkel volgt de lijst jouw looproute. Veeg een product naar links voor een notitie of om het te verwijderen.'
            }}
        </p>
        <item-note-component v-model:open="isNoteOpen" :item="itemWithNote" @saved="emit('changed')"></item-note-component>
    </section>
</template>
<style scoped>
.grocery-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.waiting {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin: 0;
    padding: 0.75rem 0.875rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-accent-soft);
    font-size: 0.875rem;
}

.waiting i {
    flex-shrink: 0;
    margin-top: 0.125rem;
}

.group-header {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    padding: 0.5rem 0.375rem;
}

.group-header h2 {
    flex: 1;
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
}

.group-header span {
    color: var(--bably-muted-text);
    font-size: 0.78125rem;
}

.group-missing .group-header h2 {
    color: var(--ion-color-warning);
}

.rows {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0;
    background: transparent;
}

ion-item-sliding {
    border-radius: var(--bably-radius-row);
}

.row {
    --background: var(--bably-card);
    --border-radius: var(--bably-radius-row);
    --padding-start: 0.875rem;
    --inner-padding-end: 0.5rem;
    --min-height: 3.25rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-row);
}

.check {
    margin-inline-end: 0.75rem;
    font-size: 1.5rem;
    color: var(--bably-muted-text);
}

.is-checked .check {
    color: var(--bably-groceries);
}

.name {
    display: block;
    font-weight: 500;
    white-space: normal;
}

.is-checked .name {
    color: var(--bably-muted-text);
    text-decoration: line-through;
}

.is-missing .name {
    color: var(--ion-color-warning);
}

.meta {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin-top: 0.125rem;
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
    white-space: normal;
}

.meta i {
    vertical-align: -0.125rem;
}

.asked {
    color: var(--ion-color-primary);
    font-weight: 600;
}

.note {
    font-style: italic;
}

.quantity {
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: var(--bably-muted);
    font-size: 0.8125rem;
    font-weight: 600;
}

.icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    margin-inline-start: 0.25rem;
    border-radius: 0.75rem;
    background: transparent;
    color: var(--bably-muted-text);
    font-size: 1.25rem;
}

.icon-button.is-active {
    background: var(--bably-muted);
    color: var(--ion-color-warning);
}

.basket {
    margin-top: 0.5rem;
}

.basket-toggle {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
    padding: 0.75rem 0.375rem;
    background: transparent;
    color: var(--bably-muted-text);
    font-size: 0.9375rem;
    font-weight: 600;
}

.basket-toggle span {
    flex: 1;
    text-align: start;
}

.empty,
.hint {
    margin: 0.5rem 0.375rem;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.empty {
    padding: 2rem 1rem;
    text-align: center;
}
</style>
