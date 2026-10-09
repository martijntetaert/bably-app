<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonButton, IonIcon, IonInput, IonSpinner } from '@ionic/vue';
import { add, cartOutline } from 'ionicons/icons';
import { shopping as shoppingApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { useOfflineChecks } from '@/views/shopping/composables/useOfflineChecks';
import { addedSummary, finishedSummary } from '@/views/shopping/composables/useShoppingMessages';

const props = defineProps<{
    shopping: boolean;
    products: ProductInterface[];
}>();

const emit = defineEmits<{
    added: [];
    finished: [];
    startShopping: [];
}>();

const MAX_SUGGESTIONS = 5;

const toast = useToast();
const { pendingCount, isOnline, flush } = useOfflineChecks();

const name = ref('');
const quantity = ref('');
const errors = ref<Record<string, string[]>>({});
const isAdding = ref(false);
const isFinishing = ref(false);
const isFocused = ref(false);
const input = ref<InstanceType<typeof IonInput> | null>(null);

defineExpose({
    focus: (): void => void input.value?.$el.setFocus(),
});

// Finishing takes what is ticked off the list, so it waits until every tick has arrived.
const isWaitingForNetwork = computed(() => !isOnline.value || pendingCount.value > 0);

// Same idea as Product::keyFor on the server: capitals and accents do not make another product.
const plain = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

// Mirrors ParseGroceryInputAction: commas (not between digits), semicolons, new lines and " en ".
const pieceCount = computed(() => name.value.split(/(?<!\d),|,(?!\d)|[;\n]|\s+en\s+/i).filter((piece) => piece.trim() !== '').length);

const isSeveral = computed(() => pieceCount.value > 1);

const suggestions = computed(() => {
    const typed = plain(name.value);

    if (typed === '' || isSeveral.value) {
        return [];
    }

    return props.products
        .filter((product) => plain(product.name).includes(typed))
        .sort((a, b) => Number(!plain(a.name).startsWith(typed)) - Number(!plain(b.name).startsWith(typed)))
        .slice(0, MAX_SUGGESTIONS);
});

const isNewProduct = computed(
    () => !isSeveral.value && name.value.trim() !== '' && !props.products.some((product) => plain(product.name) === plain(name.value)),
);

const showsSuggestions = computed(() => isFocused.value && (suggestions.value.length > 0 || isNewProduct.value || isSeveral.value));

const error = computed(() => errors.value.name?.[0] ?? errors.value.productIdentifier?.[0] ?? null);

watch(name, () => {
    errors.value = {};
});

// A tap on a suggestion blurs the input first; the list has to outlive that blur.
const blur = (): void => {
    window.setTimeout(() => {
        isFocused.value = false;
    }, 150);
};

const submit = async (fields: { name?: string; productIdentifier?: string }): Promise<void> => {
    if (isAdding.value) {
        return;
    }

    isAdding.value = true;
    errors.value = {};

    try {
        const result = await shoppingApi.add({
            ...fields,
            quantity: isSeveral.value || quantity.value.trim() === '' ? null : quantity.value.trim(),
        });
        name.value = '';
        quantity.value = '';
        const message = addedSummary(result);

        if (message !== null) {
            await (result.added.length === 0 ? toast.info(message) : toast.success(message));
        }

        emit('added');
    } catch (failure) {
        if (failure instanceof ApiError && failure.status === 422) {
            errors.value = failure.errors;
        } else {
            await toast.failure(failure);
        }
    } finally {
        isAdding.value = false;
    }
};

const pick = (product: ProductInterface): Promise<void> => submit({ productIdentifier: product.identifier });

const addTyped = (): Promise<void> => (name.value.trim() === '' ? Promise.resolve() : submit({ name: name.value }));

const finishShopping = async (): Promise<void> => {
    isFinishing.value = true;

    try {
        await flush();
        await toast.success(finishedSummary(await shoppingApi.finishTrip()));
    } catch (failure) {
        if (!(failure instanceof ApiError && failure.status === 409)) {
            await toast.failure(failure);
        }
    } finally {
        isFinishing.value = false;
        emit('finished');
    }
};
</script>
<template>
    <section class="add-item">
        <ul v-if="showsSuggestions" class="suggestions" aria-label="Producten">
            <li v-for="product in suggestions" :key="product.identifier">
                <button type="button" @click="pick(product)">{{ product.name }}</button>
            </li>
            <li v-if="isSeveral">
                <button type="button" class="new" @click="addTyped()">
                    <ion-icon :icon="add" aria-hidden="true"></ion-icon>
                    {{ pieceCount }} producten toevoegen
                </button>
            </li>
            <li v-if="isNewProduct">
                <button type="button" class="new" @click="addTyped()">
                    <ion-icon :icon="add" aria-hidden="true"></ion-icon>
                    ‘{{ name.trim() }}’ toevoegen als nieuw product
                </button>
            </li>
        </ul>
        <form class="form" @submit.prevent="addTyped()">
            <ion-input
                ref="input"
                v-model="name"
                class="name"
                fill="outline"
                placeholder="melk, brood, 6 eieren…"
                autocomplete="off"
                enterkeyhint="done"
                aria-label="Product"
                :class="{ 'ion-invalid ion-touched': error }"
                @ion-focus="isFocused = true"
                @ion-blur="blur()"
            ></ion-input>
            <ion-input
                v-if="!isSeveral"
                v-model="quantity"
                class="quantity"
                fill="outline"
                placeholder="aantal"
                autocomplete="off"
                aria-label="Aantal"
                :class="{ 'ion-invalid ion-touched': errors.quantity }"
            ></ion-input>
            <ion-button type="submit" class="submit" color="primary" :disabled="isAdding || name.trim() === ''" aria-label="Op de lijst zetten">
                <ion-spinner v-if="isAdding" name="crescent"></ion-spinner>
                <ion-icon v-else slot="icon-only" :icon="add"></ion-icon>
            </ion-button>
        </form>
        <p v-if="error || errors.quantity" class="error">{{ error ?? errors.quantity?.[0] }}</p>
        <ion-button v-if="!shopping" expand="block" class="action" @click="emit('startShopping')">
            <ion-icon slot="start" :icon="cartOutline"></ion-icon>
            Ik begin met winkelen
        </ion-button>
        <ion-button v-else expand="block" class="action" color="success" :disabled="isFinishing || isWaitingForNetwork" @click="finishShopping()">
            <ion-spinner v-if="isFinishing" name="crescent"></ion-spinner>
            <span v-else>{{ isWaitingForNetwork ? 'Afronden zodra je weer bereik hebt' : 'Winkelen afronden' }}</span>
        </ion-button>
    </section>
</template>
<style scoped>
.add-item {
    padding: 0.625rem 1rem calc(0.625rem + var(--ion-safe-area-bottom, 0px));
    border-top: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.suggestions {
    margin: 0 0 0.5rem;
    padding: 0.25rem;
    list-style: none;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
}

.suggestions button {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: transparent;
    color: var(--ion-text-color);
    font-size: 0.9375rem;
    text-align: start;
}

.suggestions button:active {
    background: var(--bably-muted);
}

.suggestions .new {
    color: var(--ion-color-primary);
    font-weight: 600;
}

.form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.name {
    flex: 1;
}

.quantity {
    flex: 0 0 5.5rem;
}

ion-input {
    --border-radius: 0.875rem;
    --background: var(--bably-muted);
    min-height: 3rem;
}

.submit {
    --border-radius: 0.875rem;
    width: 3rem;
    height: 3rem;
    margin: 0;
}

.error {
    margin: 0.375rem 0.25rem 0;
    color: var(--ion-color-danger);
    font-size: 0.8125rem;
}

.action {
    --border-radius: 0.875rem;
    margin: 0.5rem 0 0;
    min-height: 3rem;
}
</style>
