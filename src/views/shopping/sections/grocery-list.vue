<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import CheckboxComponent from '@/components/checkbox-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import ItemEditor from '@/views/shopping/sections/item-editor.vue';
import { shopping as shoppingApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';
import { ShoppingPart } from '@/views/shopping/composables/useShoppingData';
import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';

const props = defineProps<{
    groups: GroceryGroupInterface[];
    shopping: boolean;
    trip?: ShoppingTripInterface | null;
}>();

const emit = defineEmits<{
    changed: [parts: ShoppingPart[]];
}>();

const notify = useToast();

const itemToRemove = ref<GroceryItemInterface | null>(null);
const isBasketOpen = ref(false);
const itemToEdit = ref<GroceryItemInterface | null>(null);
const isEditorOpen = ref(false);
const isConfirmOpen = ref(false);
const isRemoving = ref(false);

const openCount = (group: GroceryGroupInterface): string => {
    const open = group.items.filter((item) => !item.checked).length;

    return props.shopping
        ? `${open} te gaan`
        : `${group.items.length} ${group.items.length === 1 ? 'product' : 'producten'}`;
};

const groupHint = (group: GroceryGroupInterface): string => {
    if (group.key === 'unplaced') {
        return 'Bably leert waar ze staan';
    }

    if (group.key === 'missing') {
        return 'Blijven op de lijst';
    }

    return openCount(group);
};

const { pendingCount, isOnline, setChecked: queueCheck } = useOfflineChecks();

// Goes through the queue so a tick in a store without signal stays and is sent later.
const setChecked = (item: GroceryItemInterface, checked: boolean): void => {
    item.identifiers.forEach((identifier) => queueCheck(identifier, checked));
};

// Ticking needs a trip under way, because at finish a tick becomes a purchase. At home only a
// tick left from before can be taken back.

// In the store a tick moves the product out of sight into the basket, so a mistap gets a
// way back and a buzz to say it landed.
const tick = (item: GroceryItemInterface): void => {
    const checked = !item.checked;
    setChecked(item, checked);

    if (!props.shopping || !checked) {
        return;
    }

    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    toast(`${item.name} in je mandje`, {
        id: 'basket',
        duration: 5000,
        action: {
            label: 'Ongedaan maken',
            onClick: () => setChecked(item, false),
        },
    });
};

const run = async (requests: Promise<unknown>[], parts: ShoppingPart[]): Promise<boolean> => {
    try {
        await Promise.all(requests);

        return true;
    } catch (error) {
        notify.failure(error);

        return false;
    } finally {
        emit('changed', parts);
    }
};

const setMissing = (item: GroceryItemInterface, missing: boolean): void => {
    void run(
        item.identifiers.map((identifier) => shoppingApi.markMissing(identifier, missing)),
        ['list']
    );
};

// What someone else asked for while you were already in the store.
const askedFor = (item: GroceryItemInterface): string | null => {
    const trip = props.trip;

    if (
        !trip ||
        !item.addedBy ||
        item.addedBy.identifier === trip.startedBy?.identifier ||
        Date.parse(item.addedBy.addedAt) < Date.parse(trip.startedAt)
    ) {
        return null;
    }

    return item.addedBy.firstname;
};

const visibleGroups = computed(() =>
    props.shopping
        ? props.groups
              .map((group) => ({
                  ...group,
                  items: group.items.filter((item) => !item.checked),
              }))
              .filter((group) => group.items.length > 0)
        : props.groups
);

const basket = computed(() =>
    props.shopping ? props.groups.flatMap((group) => group.items.filter((item) => item.checked)) : []
);

// With a connection a tick waits only for a blink, so the notice is for being offline only;
// a failed send flips the queue to offline itself.
const waitingMessage = computed(() => {
    const ticks = `${pendingCount.value} ${pendingCount.value === 1 ? 'vinkje wacht' : 'vinkjes wachten'}`;

    return `Geen bereik: ${ticks}. Bably stuurt ze zodra je weer verbinding hebt.`;
});

const openEditor = (item: GroceryItemInterface): void => {
    itemToEdit.value = item;
    isEditorOpen.value = true;
};

const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Right after something is put on the list, its row opens so the quantity can be set. What
// was typed may hold a quantity in front ("2 melk"), so the name only has to end it.
const editAdded = async (typed: string): Promise<void> => {
    await nextTick();

    const wanted = plain(typed);
    const item = props.groups
        .flatMap((group) => group.items)
        .find(
            (candidate) =>
                !candidate.checked &&
                (wanted === plain(candidate.name) || wanted.endsWith(` ${plain(candidate.name)}`))
        );

    if (item) {
        openEditor(item);
    }
};

defineExpose({ editAdded });

const askToRemove = (item: GroceryItemInterface): void => {
    itemToRemove.value = item;
    isConfirmOpen.value = true;
};

const removeWith = async (
    requests: (item: GroceryItemInterface) => Promise<unknown>[],
    parts: ShoppingPart[],
    message?: (item: GroceryItemInterface) => string
): Promise<void> => {
    const item = itemToRemove.value;

    if (!item) {
        return;
    }

    isRemoving.value = true;

    if (await run(requests(item), parts)) {
        isConfirmOpen.value = false;

        if (message) {
            notify.success(message(item));
        }
    }

    isRemoving.value = false;
};

const remove = (): Promise<void> =>
    removeWith((item) => item.identifiers.map((identifier) => shoppingApi.remove(identifier)), ['list']);

// Something the menu put on the list but that is always in the house goes to the staples,
// so the next dish with it does not put it back.
const markAsStaple = (): Promise<void> =>
    removeWith(
        (item) => [shoppingApi.setStaple(item.productIdentifier, true)],
        ['list', 'stock', 'suggestions'],
        (item) => `${item.name} staat in je basisvoorraad. Het menu zet het niet meer op de lijst.`
    );
</script>
<template>
    <section class="section-portal-shopping-grocery-list" :class="{ 'is-shopping': shopping }">
        <p v-if="pendingCount > 0 && !isOnline" class="waiting" role="status">
            <i class="fa-solid fa-wifi" aria-hidden="true"></i>
            {{ waitingMessage }}
        </p>
        <div v-for="group in visibleGroups" :key="group.key" class="group">
            <div class="group-header">
                <h2>{{ group.name }}</h2>
                <span>{{ groupHint(group) }}</span>
            </div>
            <div class="rows">
                <list-row-component
                    v-for="item in group.items"
                    :key="item.identifier"
                    :title="item.name"
                    :class="{
                        'is-checked': item.checked,
                        'is-missing': item.missing,
                    }"
                    clickable
                    @click="shopping ? tick(item) : openEditor(item)"
                >
                    <template v-if="shopping || item.checked" #leading>
                        <span @click.stop>
                            <checkbox-component
                                :model-value="item.checked"
                                :aria-label="item.name"
                                @update:model-value="setChecked(item, $event === true)"
                            />
                        </span>
                    </template>
                    <template v-if="item.note || item.reason || askedFor(item)" #meta>
                        <span class="meta-stack">
                            <span v-if="askedFor(item)" class="asked">
                                <i class="fa-solid fa-bell" aria-hidden="true"></i>
                                Nieuw Â· {{ askedFor(item) }}
                            </span>
                            <span v-if="item.reason">{{ item.reason }}</span>
                            <span v-if="item.note" class="note">
                                <i class="fa-solid fa-pen" aria-hidden="true"></i>
                                {{ item.note }}
                            </span>
                        </span>
                    </template>
                    <template #trailing>
                        <span v-if="item.quantity" class="quantity">{{ item.quantity }}</span>
                        <button
                            v-if="shopping"
                            type="button"
                            class="missing"
                            :class="{ 'is-active': item.missing }"
                            :aria-label="item.missing ? `${item.name} toch gevonden` : `${item.name} niet gevonden`"
                            @click.stop="setMissing(item, !item.missing)"
                        >
                            <i
                                :class="item.missing ? 'fa-solid fa-rotate-left' : 'fa-solid fa-magnifying-glass-minus'"
                                aria-hidden="true"
                            ></i>
                        </button>
                        <button
                            v-if="!shopping"
                            type="button"
                            class="edit-note"
                            :class="{ 'has-note': item.note }"
                            :aria-label="`Hoeveelheid of notitie bij ${item.name} aanpassen`"
                            @click.stop="openEditor(item)"
                        >
                            <i class="fa-solid fa-pen" aria-hidden="true"></i>
                        </button>
                        <button
                            v-if="!shopping"
                            type="button"
                            class="remove"
                            :aria-label="`${item.name} van de lijst halen`"
                            @click.stop="askToRemove(item)"
                        >
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </template>
                </list-row-component>
            </div>
        </div>
        <details
            v-if="basket.length > 0"
            class="basket"
            :open="isBasketOpen"
            @toggle="isBasketOpen = ($event.target as HTMLDetailsElement).open"
        >
            <summary>
                <i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>
                In je mandje ({{ basket.length }})
            </summary>
            <div class="rows">
                <list-row-component
                    v-for="item in basket"
                    :key="item.identifier"
                    :title="item.name"
                    class="is-checked"
                    clickable
                    @click="tick(item)"
                >
                    <template #leading>
                        <span @click.stop>
                            <checkbox-component
                                :model-value="true"
                                :aria-label="item.name"
                                @update:model-value="tick(item)"
                            />
                        </span>
                    </template>
                    <template v-if="item.quantity" #trailing>
                        <span class="quantity">{{ item.quantity }}</span>
                    </template>
                </list-row-component>
            </div>
        </details>
        <p v-if="groups.length === 0" class="empty">Je lijst is leeg. Zet hieronder iets op de lijst.</p>
        <p v-else class="hint">
            {{
                shopping
                    ? 'Vink af terwijl je loopt. Bably onthoudt per product waar het in deze winkel staat.'
                    : 'In de winkel volgt de lijst jouw looproute.'
            }}
        </p>

        <item-editor v-model:open="isEditorOpen" :item="itemToEdit" @saved="emit('changed', ['list'])"></item-editor>

        <confirm-dialog-component
            v-model:open="isConfirmOpen"
            title="Van de lijst halen?"
            :description="`${itemToRemove?.name ?? ''} verdwijnt van de boodschappenlijst.`"
            confirm-label="Van de lijst"
            :secondary-label="itemToRemove?.reason ? 'Zit in mijn voorraad, niet meer op de lijst zetten' : undefined"
            :processing="isRemoving"
            @confirm="remove()"
            @secondary="markAsStaple()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/grocery-list.css';
</style>
