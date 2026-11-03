<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import ActionBarComponent from '@/components/action-bar-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import { shopping as shoppingApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useBarcodeScanner } from '@/composables/useBarcodeScanner';
import { useToast } from '@/composables/useToast';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';
import { ShoppingPart } from '@/views/shopping/composables/useShoppingData';
import { addedSummary, finishedSummary } from '@/views/shopping/composables/useShoppingMessages';

const props = defineProps<{
    shopping: boolean;
    products: ProductInterface[];
}>();

const emit = defineEmits<{
    startShopping: [];
    changed: [parts?: ShoppingPart[]];
    added: [single: string | null];
    scanToTick: [];
}>();

const MAX_SUGGESTIONS = 5;

const toast = useToast();
const name = ref('');
const errors = ref<Record<string, string[]>>({});
const isAdding = ref(false);
const isFinishing = ref(false);
const isAddingWhileShopping = ref(false);
const input = ref<HTMLInputElement | null>(null);
const { scan, isAvailable: canScan, isScanning } = useBarcodeScanner();
// A scanned barcode nobody knows yet waits here until the product has a name.
const unnamedBarcode = ref<string | null>(null);

const showsForm = computed(() => !props.shopping || isAddingWhileShopping.value);

// Focused within the tap itself, or a phone keeps its keyboard closed.
const focus = (): void => {
    isAddingWhileShopping.value = props.shopping;
    void nextTick(() => input.value?.focus());
};

defineExpose({ focus });

const { pendingCount, isOnline, flush } = useOfflineChecks();

// Finishing takes what is ticked off the list, so it waits until every tick has arrived.
const isWaitingForNetwork = computed(() => !isOnline.value || pendingCount.value > 0);
const isFocused = ref(false);
const highlighted = ref(-1);

// Same idea as Product::keyFor on the server: capitals and accents do not make another product.
const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Mirrors ParseGroceryInputAction: commas (not between digits), semicolons, new lines and " en ".
const pieceCount = computed(
    () => name.value.split(/(?<!\d),|,(?!\d)|[;\n]|\s+en\s+/i).filter((piece) => piece.trim() !== '').length
);

const isSeveral = computed(() => pieceCount.value > 1);

const suggestions = computed(() => {
    const typed = plain(name.value);

    if (typed === '' || isSeveral.value || unnamedBarcode.value !== null) {
        return [];
    }

    return props.products
        .filter((product) => plain(product.name).includes(typed))
        .sort((a, b) => Number(!plain(b.name).startsWith(typed)) - Number(!plain(a.name).startsWith(typed)))
        .slice(0, MAX_SUGGESTIONS);
});

const isNewProduct = computed(
    () =>
        unnamedBarcode.value === null &&
        !isSeveral.value &&
        name.value.trim() !== '' &&
        !props.products.some((product) => plain(product.name) === plain(name.value))
);

const showsSuggestions = computed(
    () => isFocused.value && (suggestions.value.length > 0 || isNewProduct.value || isSeveral.value)
);

const error = computed(
    () => errors.value.name?.[0] ?? errors.value.productIdentifier?.[0] ?? errors.value.barcode?.[0] ?? null
);

watch(name, () => {
    highlighted.value = -1;
});

const closeWhileShopping = (): void => {
    isAddingWhileShopping.value = false;
};

watch(() => props.shopping, closeWhileShopping);

// Typed text survives a stray tap; only an empty field folds back to the finish button.
const blur = (): void => {
    isFocused.value = false;

    if (name.value.trim() === '') {
        closeWhileShopping();
    }
};

// One product gets its row opened afterwards, so the quantity can be set; several at once
// would mean a drawer per product. In the store it only has to be on the list, quickly.
const submit = async (fields: { name?: string; productIdentifier?: string; barcode?: string }): Promise<void> => {
    if (isAdding.value) {
        return;
    }

    isAdding.value = true;
    errors.value = {};
    const single = isSeveral.value || props.shopping ? null : name.value.trim();

    try {
        const message = addedSummary(await shoppingApi.add(fields));
        name.value = '';
        unnamedBarcode.value = null;
        closeWhileShopping();

        if (single) {
            input.value?.blur();
        }

        emit('added', single);

        if (message !== null) {
            toast.info(message);
        }
    } catch (failure) {
        if (failure instanceof ApiError && failure.status === 422) {
            errors.value = failure.errors;

            if (fields.barcode !== undefined && failure.firstError('name') !== null) {
                unnamedBarcode.value = fields.barcode;
                focus();
            }
        } else {
            toast.failure(failure);
        }
    } finally {
        isAdding.value = false;
    }
};

const pick = (product: ProductInterface): void => {
    name.value = product.name;
    void submit({ productIdentifier: product.identifier });
};

const addTyped = (): void => {
    const chosen = suggestions.value[highlighted.value];

    if (chosen) {
        pick(chosen);

        return;
    }

    if (name.value.trim() === '') {
        return;
    }

    if (unnamedBarcode.value !== null) {
        void submit({ barcode: unnamedBarcode.value, name: name.value.trim() });

        return;
    }

    void submit({ name: name.value });
};

const scanToAdd = async (): Promise<void> => {
    const barcode = await scan();

    if (barcode !== null) {
        name.value = '';
        await submit({ barcode });
    }
};

const forgetBarcode = (): void => {
    unnamedBarcode.value = null;
    errors.value = {};
};

const move = (step: number): void => {
    if (suggestions.value.length === 0) {
        return;
    }

    highlighted.value = (highlighted.value + step + suggestions.value.length) % suggestions.value.length;
};

const finishShopping = async (): Promise<void> => {
    isFinishing.value = true;

    try {
        await flush();
        toast.success(finishedSummary(await shoppingApi.finishTrip()));
    } catch (failure) {
        // Someone else already finished this trip; the reload shows the list as it is now.
        if (!(failure instanceof ApiError && failure.status === 409)) {
            toast.failure(failure);
        }
    } finally {
        isFinishing.value = false;
        emit('changed');
    }
};
</script>
<template>
    <section class="section-portal-shopping-add-item">
        <action-bar-component>
            <template v-if="showsForm">
                <ul
                    v-if="showsSuggestions"
                    id="product-suggestions"
                    class="suggestions"
                    role="listbox"
                    aria-label="Producten"
                >
                    <li
                        v-for="(product, index) in suggestions"
                        :id="`product-suggestion-${index}`"
                        :key="product.identifier"
                        role="option"
                        :aria-selected="highlighted === index"
                        :class="{ 'is-highlighted': highlighted === index }"
                        @mousedown.prevent="pick(product)"
                    >
                        {{ product.name }}
                    </li>
                    <li
                        v-if="isSeveral"
                        class="new"
                        role="option"
                        :aria-selected="false"
                        @mousedown.prevent="addTyped()"
                    >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        {{ pieceCount }} producten toevoegen
                    </li>
                    <li
                        v-if="isNewProduct"
                        class="new"
                        role="option"
                        :aria-selected="false"
                        @mousedown.prevent="addTyped()"
                    >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        ‘{{ name.trim() }}’ toevoegen als nieuw product
                    </li>
                </ul>
                <form-component class="form" @submit="addTyped()">
                    <input
                        ref="input"
                        v-model="name"
                        class="input"
                        name="product"
                        :placeholder="unnamedBarcode ? 'Naam van het product' : 'melk, brood, 6 eieren…'"
                        autocomplete="off"
                        role="combobox"
                        aria-controls="product-suggestions"
                        :aria-expanded="showsSuggestions"
                        :aria-activedescendant="highlighted >= 0 ? `product-suggestion-${highlighted}` : undefined"
                        required
                        @focus="isFocused = true"
                        @blur="blur()"
                        @keydown.down.prevent="move(1)"
                        @keydown.up.prevent="move(-1)"
                        @keydown.esc="
                            isFocused = false;
                            closeWhileShopping();
                        "
                    />
                    <button-component
                        v-if="canScan && unnamedBarcode === null"
                        icon="fa-solid fa-barcode"
                        variant="soft"
                        label="Barcode scannen om op de lijst te zetten"
                        :disabled="isAdding || isScanning"
                        @click="scanToAdd()"
                    />
                    <button-component
                        icon="fa-solid fa-plus"
                        variant="secondary"
                        type="submit"
                        label="Op de lijst zetten"
                        :disabled="isAdding"
                    />
                </form-component>
                <p v-if="error" class="error">
                    {{ error }}
                    <button v-if="unnamedBarcode" type="button" class="forget" @click="forgetBarcode()">
                        Niet toevoegen
                    </button>
                </p>
                <button-component
                    v-if="!shopping"
                    class="start"
                    icon="fa-solid fa-cart-shopping"
                    @click="emit('startShopping')"
                >
                    Ik begin met winkelen
                </button-component>
            </template>
            <div v-else class="shopping-actions">
                <button-component
                    class="finish"
                    variant="soft"
                    :disabled="isFinishing || isWaitingForNetwork"
                    @click="finishShopping()"
                >
                    {{ isWaitingForNetwork ? 'Afronden zodra je weer bereik hebt' : 'Winkelen afronden' }}
                </button-component>
                <button-component
                    v-if="canScan"
                    icon="fa-solid fa-barcode"
                    variant="soft"
                    label="Barcode scannen om af te vinken"
                    :disabled="isScanning"
                    @click="emit('scanToTick')"
                />
                <button-component icon="fa-solid fa-plus" variant="secondary" label="Iets toevoegen" @click="focus()" />
            </div>
        </action-bar-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/add-item.css';
</style>
