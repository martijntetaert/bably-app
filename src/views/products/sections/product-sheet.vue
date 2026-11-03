<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { shopping } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useBarcodeScanner } from '@/composables/useBarcodeScanner';
import { formatDate } from '@/composables/useDateTime';
import { usePlus } from '@/composables/usePlus';
import { useToast } from '@/composables/useToast';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import SegmentedControlComponent from '@/components/segmented-control-component.vue';
import ToggleComponent from '@/components/toggle-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { MicroCategoryInterface } from '@/interfaces/MicroCategoryInterface';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { StockLevel } from '@/interfaces/StockItemInterface';
import { matchesSearch } from '@/lib/productSearch';

type Confirmation = { kind: 'merge'; target: ProductInterface } | { kind: 'barcode'; ean: string };

const props = defineProps<{
    product: ProductInterface | null;
    products: ProductInterface[];
    categories: MicroCategoryInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const MERGE_CANDIDATES_SHOWN = 5;

const levels: { value: StockLevel; label: string }[] = [
    { value: 'in', label: 'Op voorraad' },
    { value: 'low', label: 'Bijna op' },
    { value: 'out', label: 'Op' },
];

const toast = useToast();
const { hasPlus, withPlus } = usePlus();
const { scan, isAvailable: canScan, isScanning } = useBarcodeScanner();

const name = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const isUpdating = ref(false);

const mergeSearch = ref('');
const confirmation = ref<Confirmation | null>(null);
const isConfirming = ref(false);
const isConfirmProcessing = ref(false);

const mergeCandidates = computed(() =>
    mergeSearch.value.trim() === ''
        ? []
        : props.products
              .filter(
                  (candidate) =>
                      candidate.identifier !== props.product?.identifier && matchesSearch(candidate, mergeSearch.value)
              )
              .slice(0, MERGE_CANDIDATES_SHOWN)
);

const history = computed(() => {
    const product = props.product;

    if (!product?.lastBoughtAt) {
        return 'Nog nooit gekocht.';
    }

    return `Laatst gekocht ${formatDate(product.lastBoughtAt)} · ${product.purchasesCount ?? 0}× gekocht`;
});

const category = computed(() => props.product?.microCategory ?? '');

const categoryHint = computed(() =>
    props.product?.microCategory && !props.product.microCategorySetByUser
        ? 'Bably koos deze categorie op basis van de naam.'
        : 'Bepaalt waar het product op je lijst staat zolang Bably de winkel nog niet kent.'
);

const snoozeHint = computed(() =>
    props.product?.snoozedUntil
        ? `Bably vraagt het weer vanaf ${formatDate(props.product.snoozedUntil)}.`
        : 'Nog genoeg in huis? Bably vraagt het dan later opnieuw.'
);

const confirmTitle = computed(() => (confirmation.value?.kind === 'merge' ? 'Samenvoegen?' : 'Barcode loskoppelen?'));

const confirmDescription = computed(() => {
    const product = props.product;
    const asked = confirmation.value;

    if (!product || !asked) {
        return '';
    }

    return asked.kind === 'merge'
        ? `${product.name} gaat op in ${asked.target.name}: de lijst, de aankopen, de recepten en de plaats in de winkel. ${product.name} verdwijnt.`
        : `Barcode ${asked.ean} hoort dan niet meer bij ${product.name}. Scan je ze nog eens, dan vraagt Bably welk product het is.`;
});

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    errors.value = {};
    name.value = props.product?.name ?? '';
    mergeSearch.value = '';
});

const rename = async (): Promise<void> => {
    if (!props.product) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await shopping.renameProduct(props.product.identifier, name.value.trim());
        emit('changed');
        open.value = false;
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        processing.value = false;
    }
};

const update = async (request: (product: ProductInterface) => Promise<unknown>): Promise<void> => {
    if (!props.product || isUpdating.value) {
        return;
    }

    isUpdating.value = true;

    try {
        await request(props.product);
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            toast.info(Object.values(error.errors)[0]?.[0] ?? error.message);
        } else {
            toast.failure(error);
        }
    } finally {
        isUpdating.value = false;
        emit('changed');
    }
};

// An empty choice hands the category back to Bably, which guesses it from the name again.
const chooseCategory = (value: string): void => {
    void update((product) => shopping.setCategory(product.identifier, value === '' ? null : value));
};

const setStaple = (staple: boolean): void => {
    withPlus(() => void update((product) => shopping.setStaple(product.identifier, staple)));
};

const setStock = (level: StockLevel): void => {
    withPlus(() => void update((product) => shopping.setStock(product.identifier, level)));
};

const snooze = (): void => {
    withPlus(() => void update((product) => shopping.snooze(product.identifier)));
};

const scanBarcode = async (): Promise<void> => {
    const ean = await scan();

    if (ean === null) {
        return;
    }

    await update(async (product) => {
        await shopping.linkBarcode(product.identifier, ean);
        toast.success(`Barcode gekoppeld aan ${product.name}.`);
    });
};

const ask = (asked: Confirmation): void => {
    confirmation.value = asked;
    isConfirming.value = true;
};

const confirm = async (): Promise<void> => {
    const product = props.product;
    const asked = confirmation.value;

    if (!product || !asked) {
        return;
    }

    isConfirmProcessing.value = true;

    try {
        if (asked.kind === 'merge') {
            await shopping.mergeProduct(product.identifier, asked.target.identifier);
            toast.success(`${product.name} is samengevoegd met ${asked.target.name}.`);
            open.value = false;
        } else {
            await shopping.unlinkBarcode(product.identifier, asked.ean);
        }

        emit('changed');
    } catch (error) {
        toast.failure(error);
    } finally {
        isConfirming.value = false;
        isConfirmProcessing.value = false;
    }
};
</script>
<template>
    <section class="section-portal-products-product-sheet">
        <drawer-component v-model:open="open" :title="product?.name ?? 'Product'" :description="history">
            <form-component class="form" @submit="rename()">
                <div class="field">
                    <section-label-component>Naam</section-label-component>
                    <input-component v-model="name" name="product" autocomplete="off" required />
                    <p v-if="errors.name" class="error">
                        {{ errors.name[0] }}
                    </p>
                    <p v-else class="hint">Een nieuwe naam geldt overal: op de lijst, in je recepten en in de route.</p>
                </div>

                <div class="field">
                    <section-label-component>Categorie</section-label-component>
                    <select
                        class="select"
                        name="category"
                        :value="category"
                        :disabled="isUpdating"
                        @change="chooseCategory(($event.target as HTMLSelectElement).value)"
                    >
                        <option value="">Laat Bably kiezen</option>
                        <option v-for="option in categories" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="hint">{{ categoryHint }}</p>
                </div>

                <div class="field">
                    <section-label-component>Voorraad</section-label-component>
                    <div class="panel">
                        <div class="line">
                            <span class="what">
                                <span class="name">Basisproduct</span>
                                <span class="meta">Altijd in huis; het weekmenu zet het niet op de lijst.</span>
                            </span>
                            <toggle-component
                                :model-value="product?.isStaple === true"
                                label="Basisproduct"
                                @update:model-value="setStaple($event)"
                            />
                        </div>
                        <template v-if="product?.isStaple && hasPlus">
                            <div class="line">
                                <segmented-control-component
                                    class="levels"
                                    :model-value="product.stockLevel ?? 'in'"
                                    :options="levels"
                                    label="Voorraad"
                                    @update:model-value="setStock($event)"
                                />
                            </div>
                            <div class="line">
                                <span class="what">
                                    <span class="meta">{{ snoozeHint }}</span>
                                </span>
                                <button type="button" class="small" :disabled="isUpdating" @click="snooze()">
                                    Nog genoeg
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="field">
                    <section-label-component>Barcodes</section-label-component>
                    <list-group-component v-if="(product?.barcodes ?? []).length > 0">
                        <list-row-component v-for="ean in product?.barcodes ?? []" :key="ean" :title="ean" grouped>
                            <template #trailing>
                                <button
                                    type="button"
                                    class="unlink"
                                    :aria-label="`Barcode ${ean} loskoppelen`"
                                    @click="ask({ kind: 'barcode', ean })"
                                >
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </template>
                        </list-row-component>
                    </list-group-component>
                    <p v-else-if="canScan" class="hint">
                        Met een barcode vink je het product in de winkel af door te scannen.
                    </p>
                    <p v-else class="hint">Nog geen barcode gekoppeld.</p>
                    <button-component
                        v-if="canScan"
                        variant="soft"
                        icon="fa-solid fa-barcode"
                        :disabled="isScanning || isUpdating"
                        @click="scanBarcode()"
                    >
                        Barcode scannen
                    </button-component>
                </div>

                <div class="field">
                    <section-label-component>Samenvoegen met…</section-label-component>
                    <input-component
                        v-model="mergeSearch"
                        type="search"
                        placeholder="Zoek het juiste product"
                        autocomplete="off"
                    />
                    <list-group-component v-if="mergeCandidates.length > 0">
                        <list-row-component
                            v-for="candidate in mergeCandidates"
                            :key="candidate.identifier"
                            :title="candidate.name"
                            grouped
                            clickable
                            @click="ask({ kind: 'merge', target: candidate })"
                        >
                            <template #trailing>
                                <i class="fa-solid fa-code-merge merge" aria-hidden="true"></i>
                            </template>
                        </list-row-component>
                    </list-group-component>
                    <p v-else-if="mergeSearch.trim() !== ''" class="no-match">Geen ander product gevonden.</p>
                </div>

                <div class="actions">
                    <button-component type="submit" :disabled="processing || name.trim() === ''">Bewaren</button-component>
                    <button-component variant="ghost" @click="open = false">Annuleren</button-component>
                </div>
            </form-component>
        </drawer-component>

        <confirm-dialog-component
            v-if="product && confirmation"
            v-model:open="isConfirming"
            :title="confirmTitle"
            :description="confirmDescription"
            :confirm-label="confirmation.kind === 'merge' ? 'Samenvoegen' : 'Loskoppelen'"
            :processing="isConfirmProcessing"
            @confirm="confirm()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/products/sections/product-sheet.css';
</style>
