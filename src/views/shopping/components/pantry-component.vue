<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { close } from 'ionicons/icons';
import { shopping } from '@/api/bably';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { StockItemInterface, StockLevel } from '@/interfaces/StockItemInterface';

const stock = defineModel<StockItemInterface[]>('stock', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const toast = useToast();
const confirm = useConfirm();

const levels: { value: StockLevel; label: string }[] = [
    { value: 'in', label: 'Op voorraad' },
    { value: 'low', label: 'Bijna op' },
    { value: 'out', label: 'Op' },
];

const isProbablyLow = (product: StockItemInterface): boolean => product.level === 'in' && product.probablyLowEveryDays !== null;

const groups = computed(() =>
    [
        { key: 'probably-low', name: 'Waarschijnlijk bijna op', products: stock.value.filter(isProbablyLow) },
        { key: 'refill', name: 'Aanvullen', products: stock.value.filter((product) => product.level !== 'in') },
        { key: 'in', name: 'Op voorraad', products: stock.value.filter((product) => product.level === 'in' && !isProbablyLow(product)) },
    ].filter((group) => group.products.length > 0),
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

const optimistically = async (product: StockItemInterface, change: Partial<StockItemInterface>, request: () => Promise<void>): Promise<void> => {
    stock.value = stock.value.map((item) => (item.identifier === product.identifier ? { ...item, ...change } : item));

    try {
        await request();
    } catch (error) {
        await toast.failure(error);
    } finally {
        emit('changed');
    }
};

const setLevel = (product: StockItemInterface, level: StockLevel): Promise<void> =>
    optimistically(product, { level }, () => shopping.setStock(product.identifier, level));

// The cupboard says otherwise: asked again after half the usual rhythm.
const stillEnough = (product: StockItemInterface): Promise<void> =>
    optimistically(product, { probablyLowEveryDays: null }, () => shopping.snooze(product.identifier));

const askToRemove = async (product: StockItemInterface): Promise<void> => {
    const confirmed = await confirm(
        'Niet meer bijhouden?',
        `${product.name} verdwijnt uit je voorraad. Het weekmenu zet het dan weer op de lijst als een gerecht het nodig heeft.`,
        'Uit de voorraad',
    );

    if (!confirmed) {
        return;
    }

    try {
        await shopping.setStaple(product.identifier, false);
        await toast.success(`${product.name} komt weer op de lijst als een gerecht het nodig heeft.`);
    } catch (error) {
        await toast.failure(error);
    } finally {
        emit('changed');
    }
};
</script>
<template>
    <section class="pantry">
        <div v-for="group in groups" :key="group.key" class="group" :class="`group-${group.key}`">
            <div class="group-header">
                <h2>{{ group.name }}</h2>
                <span>{{ group.products.length }} {{ group.products.length === 1 ? 'product' : 'producten' }}</span>
            </div>
            <div class="rows">
                <div v-for="product in group.products" :key="product.identifier" class="row" :class="`is-${product.level}`">
                    <div class="what">
                        <span class="name">{{ product.name }}</span>
                        <span class="meta">{{ meta(product) }}</span>
                    </div>
                    <div v-if="isProbablyLow(product)" class="asks">
                        <button type="button" class="ask still-enough" @click="stillEnough(product)">Nog genoeg</button>
                        <button type="button" class="ask to-list" @click="setLevel(product, 'low')">Op de lijst</button>
                    </div>
                    <template v-else>
                        <div class="states" role="radiogroup" :aria-label="`Voorraad van ${product.name}`">
                            <button
                                v-for="level in levels"
                                :key="level.value"
                                type="button"
                                role="radio"
                                :aria-label="level.label"
                                :aria-checked="product.level === level.value"
                                :class="[`state-${level.value}`, { 'is-active': product.level === level.value }]"
                                @click="setLevel(product, level.value)"
                            >
                                <span class="dot"></span>
                            </button>
                        </div>
                        <button type="button" class="remove" :aria-label="`${product.name} niet meer bijhouden`" @click="askToRemove(product)">
                            <ion-icon :icon="close" aria-hidden="true"></ion-icon>
                        </button>
                    </template>
                </div>
            </div>
        </div>
        <p v-if="stock.length === 0" class="empty">
            Zet hier wat je altijd in huis hebt, zoals boter, melk of olie. Het weekmenu zet dat niet meer op de lijst; tik op oranje of rood als
            het bijna op is.
        </p>
        <p v-else class="hint">Wat bijna op of op is, staat vanzelf op de lijst. Koop je het, dan staat het weer op groen.</p>
    </section>
</template>
<style scoped>
.pantry {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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

.rows {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    min-height: 3.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.875rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
}

.what {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.name {
    font-weight: 500;
}

.meta {
    color: var(--bably-muted-text);
    font-size: 0.8125rem;
}

.is-low .meta,
.group-probably-low .meta {
    color: var(--ion-color-warning);
}

.is-out .meta {
    color: var(--ion-color-danger);
}

.asks {
    display: flex;
    gap: 0.375rem;
}

.ask {
    height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 0.6875rem;
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
}

.still-enough {
    background: var(--bably-muted);
    color: var(--ion-text-color);
}

.to-list {
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
}

.states {
    display: flex;
    gap: 0.3125rem;
}

.states button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.6875rem;
    background: var(--bably-muted);
}

.dot {
    width: 0.8125rem;
    height: 0.8125rem;
    border-radius: 50%;
    background: var(--bably-border);
}

.state-in.is-active {
    background: rgba(var(--ion-color-success-rgb), 0.16);
}

.state-in.is-active .dot {
    background: var(--ion-color-success);
}

.state-low.is-active {
    background: rgba(var(--ion-color-warning-rgb), 0.16);
}

.state-low.is-active .dot {
    background: var(--ion-color-warning);
}

.state-out.is-active {
    background: rgba(var(--ion-color-danger-rgb), 0.16);
}

.state-out.is-active .dot {
    background: var(--ion-color-danger);
}

.remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    background: transparent;
    color: var(--bably-muted-text);
    font-size: 1.125rem;
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
