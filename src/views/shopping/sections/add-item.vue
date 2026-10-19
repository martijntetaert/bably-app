<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ActionBarComponent from '@/components/action-bar-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import { shopping as shoppingApi } from '@/api/bably';
import { ApiError } from '@/api/client';
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
}>();

const MAX_SUGGESTIONS = 5;

const toast = useToast();
const name = ref('');
const errors = ref<Record<string, string[]>>({});
const isAdding = ref(false);
const isFinishing = ref(false);
const input = ref<HTMLInputElement | null>(null);

defineExpose({
    focus: (): void => input.value?.focus(),
});

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

    if (typed === '' || isSeveral.value) {
        return [];
    }

    return props.products
        .filter((product) => plain(product.name).includes(typed))
        .sort((a, b) => Number(!plain(b.name).startsWith(typed)) - Number(!plain(a.name).startsWith(typed)))
        .slice(0, MAX_SUGGESTIONS);
});

const isNewProduct = computed(
    () =>
        !isSeveral.value &&
        name.value.trim() !== '' &&
        !props.products.some((product) => plain(product.name) === plain(name.value))
);

const showsSuggestions = computed(
    () => isFocused.value && (suggestions.value.length > 0 || isNewProduct.value || isSeveral.value)
);

const error = computed(() => errors.value.name?.[0] ?? errors.value.productIdentifier?.[0] ?? null);

watch(name, () => {
    highlighted.value = -1;
});

// One product gets its row opened afterwards, so the quantity can be set; several at once
// would mean a drawer per product.
const submit = async (fields: { name?: string; productIdentifier?: string }): Promise<void> => {
    if (isAdding.value) {
        return;
    }

    isAdding.value = true;
    errors.value = {};
    const single = isSeveral.value ? null : name.value.trim();

    try {
        const message = addedSummary(await shoppingApi.add(fields));
        name.value = '';

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

    void submit({ name: name.value });
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
            <template v-if="!shopping">
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
                        placeholder="melk, brood, 6 eieren…"
                        autocomplete="off"
                        role="combobox"
                        aria-controls="product-suggestions"
                        :aria-expanded="showsSuggestions"
                        :aria-activedescendant="highlighted >= 0 ? `product-suggestion-${highlighted}` : undefined"
                        required
                        @focus="isFocused = true"
                        @blur="isFocused = false"
                        @keydown.down.prevent="move(1)"
                        @keydown.up.prevent="move(-1)"
                        @keydown.esc="isFocused = false"
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
                </p>
                <button-component class="start" icon="fa-solid fa-cart-shopping" @click="emit('startShopping')">
                    Ik begin met winkelen
                </button-component>
            </template>
            <button-component
                v-else
                variant="soft"
                :disabled="isFinishing || isWaitingForNetwork"
                @click="finishShopping()"
            >
                {{ isWaitingForNetwork ? 'Afronden zodra je weer bereik hebt' : 'Winkelen afronden' }}
            </button-component>
        </action-bar-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/add-item.css';
</style>
