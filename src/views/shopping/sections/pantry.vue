<script setup lang="ts">
import { computed, ref } from 'vue';
import ListRowComponent from '@/components/list-row-component.vue';
import ActionBarComponent from '@/components/action-bar-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { shopping } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { ShoppingPart } from '@/views/shopping/composables/useShoppingData';
import { StockItemInterface, StockLevel } from '@/interfaces/StockItemInterface';
import { SwipeActionInterface } from '@/interfaces/SwipeActionInterface';

defineOptions({ name: 'ShoppingPantry' });

const stock = defineModel<StockItemInterface[]>('stock', { required: true });

const emit = defineEmits<{
    changed: [parts: ShoppingPart[]];
}>();

const only: ShoppingPart[] = ['stock', 'list', 'suggestions'];

const levels: { value: StockLevel; label: string }[] = [
    { value: 'in', label: 'Op voorraad' },
    { value: 'low', label: 'Bijna op' },
    { value: 'out', label: 'Op' },
];

const toast = useToast();
const name = ref('');
const isAdding = ref(false);

const productToRemove = ref<StockItemInterface | null>(null);
const isConfirmOpen = ref(false);
const isRemoving = ref(false);

const isProbablyLow = (product: StockItemInterface): boolean =>
    product.level === 'in' && product.probablyLowEveryDays !== null;

const groups = computed(() =>
    [
        {
            key: 'probably-low',
            name: 'Waarschijnlijk bijna op',
            products: stock.value.filter(isProbablyLow),
        },
        {
            key: 'refill',
            name: 'Aanvullen',
            products: stock.value.filter((product) => product.level !== 'in'),
        },
        {
            key: 'in',
            name: 'Op voorraad',
            products: stock.value.filter((product) => product.level === 'in' && !isProbablyLow(product)),
        },
    ].filter((group) => group.products.length > 0)
);

const meta = (product: StockItemInterface): string => {
    if (isProbablyLow(product)) {
        return `Je koopt dit om de ${product.probablyLowEveryDays} dagen`;
    }

    if (product.level === 'out') {
        return 'Op · staat op de lijst';
    }

    return product.level === 'low' ? 'Bijna op · staat op de lijst' : 'Op voorraad';
};

const optimistically = async (
    product: StockItemInterface,
    change: Partial<StockItemInterface>,
    request: () => Promise<void>
): Promise<void> => {
    stock.value = stock.value.map((item) => (item.identifier === product.identifier ? { ...item, ...change } : item));

    try {
        await request();
    } catch (error) {
        toast.failure(error);
    } finally {
        emit('changed', only);
    }
};

const setLevel = (product: StockItemInterface, level: StockLevel): void => {
    void optimistically(product, { level }, () => shopping.setStock(product.identifier, level));
};

// The cupboard says otherwise: asked again after half the usual rhythm.
const stillEnough = (product: StockItemInterface): void => {
    void optimistically(product, { probablyLowEveryDays: null }, () => shopping.snooze(product.identifier));
};

const add = async (): Promise<void> => {
    isAdding.value = true;

    try {
        await shopping.addStaple(name.value.trim());
        name.value = '';
        emit('changed', only);
    } catch (error) {
        toast.failure(error);
    } finally {
        isAdding.value = false;
    }
};

const levelSwipeFor = (product: StockItemInterface): SwipeActionInterface =>
    product.level === 'in'
        ? { label: 'Op de lijst', tone: 'primary', run: () => setLevel(product, 'low') }
        : { label: 'Weer genoeg', tone: 'primary', run: () => setLevel(product, 'in') };

const removeSwipeFor = (product: StockItemInterface): SwipeActionInterface[] => [
    { label: 'Niet bijhouden', tone: 'destructive', run: () => askToRemove(product) },
];

const askToRemove = (product: StockItemInterface): void => {
    productToRemove.value = product;
    isConfirmOpen.value = true;
};

const remove = async (): Promise<void> => {
    const product = productToRemove.value;

    if (!product) {
        return;
    }

    isRemoving.value = true;

    try {
        await shopping.setStaple(product.identifier, false);
        isConfirmOpen.value = false;
        toast.success(`${product.name} komt weer op de lijst als een gerecht het nodig heeft.`);
    } catch (error) {
        toast.failure(error);
    } finally {
        isRemoving.value = false;
        emit('changed', only);
    }
};
</script>
<template>
    <section class="section-portal-shopping-pantry">
        <div v-for="group in groups" :key="group.key" class="group" :class="`group-${group.key}`">
            <div class="group-header">
                <h2>{{ group.name }}</h2>
                <span>
                    {{ group.products.length }}
                    {{ group.products.length === 1 ? 'product' : 'producten' }}
                </span>
            </div>
            <div class="rows">
                <list-row-component
                    v-for="product in group.products"
                    :key="product.identifier"
                    :title="product.name"
                    :meta="meta(product)"
                    :class="`is-${product.level}`"
                    :leading-swipe-action="levelSwipeFor(product)"
                    :swipe-actions="removeSwipeFor(product)"
                >
                    <template v-if="isProbablyLow(product)" #trailing>
                        <button type="button" class="ask still-enough" @click="stillEnough(product)">Nog genoeg</button>
                        <button type="button" class="ask to-list" @click="setLevel(product, 'low')">Op de lijst</button>
                    </template>
                    <template v-else #trailing>
                        <div class="states" role="radiogroup" :aria-label="`Voorraad van ${product.name}`">
                            <button
                                v-for="level in levels"
                                :key="level.value"
                                type="button"
                                role="radio"
                                :title="level.label"
                                :aria-label="level.label"
                                :aria-checked="product.level === level.value"
                                :class="[
                                    `state-${level.value}`,
                                    {
                                        'is-active': product.level === level.value,
                                    },
                                ]"
                                @click="setLevel(product, level.value)"
                            >
                                <span class="dot"></span>
                            </button>
                        </div>
                        <button
                            type="button"
                            class="remove"
                            :aria-label="`${product.name} niet meer bijhouden`"
                            @click="askToRemove(product)"
                        >
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </template>
                </list-row-component>
            </div>
        </div>
        <p v-if="stock.length === 0" class="empty">
            Zet hier wat je altijd in huis hebt, zoals boter, melk of olie. Het weekmenu zet dat niet meer op de lijst;
            tik op oranje of rood als het bijna op is.
        </p>
        <p v-else class="hint">
            Wat bijna op of op is, staat vanzelf op de lijst. Koop je het, dan staat het weer op groen.
        </p>

        <div class="add-bar">
            <action-bar-component>
                <form-component class="form" @submit="add()">
                    <input-component
                        v-model="name"
                        class="input"
                        name="stock"
                        placeholder="Product in je voorraad…"
                        autocomplete="off"
                    />
                    <button-component
                        icon="fa-solid fa-plus"
                        type="submit"
                        label="Aan je voorraad toevoegen"
                        :disabled="isAdding || name.trim() === ''"
                    />
                </form-component>
            </action-bar-component>
        </div>

        <confirm-dialog-component
            v-model:open="isConfirmOpen"
            title="Niet meer bijhouden?"
            :description="`${
                productToRemove?.name ?? ''
            } verdwijnt uit je voorraad. Het weekmenu zet het dan weer op de lijst als een gerecht het nodig heeft.`"
            confirm-label="Uit de voorraad"
            :processing="isRemoving"
            @confirm="remove()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/pantry.css';
</style>
