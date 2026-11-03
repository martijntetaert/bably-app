<script setup lang="ts">
import { computed, ref } from 'vue';
import { shopping } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import InputComponent from '@/components/form/input-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import { MicroCategoryInterface } from '@/interfaces/MicroCategoryInterface';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { matchesSearch } from '@/lib/productSearch';

type Filter = 'all' | 'uncategorised' | 'staples' | 'barcodes';

const props = defineProps<{
    products: ProductInterface[];
    categories: MicroCategoryInterface[];
}>();

const emit = defineEmits<{
    open: [product: ProductInterface];
    changed: [];
}>();

const UNCATEGORISED = 'uncategorised';

const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'uncategorised', label: 'Zonder categorie' },
    { value: 'staples', label: 'Basisproducten' },
    { value: 'barcodes', label: 'Met barcode' },
];

const toast = useToast();
const search = ref('');
const filter = ref<Filter>('all');
const sorting = ref<string[]>([]);

const isCategorised = (product: ProductInterface): boolean =>
    props.categories.some((category) => category.value === product.microCategory);

const passesFilter = (product: ProductInterface): boolean => {
    switch (filter.value) {
        case 'uncategorised':
            return !isCategorised(product);
        case 'staples':
            return product.isStaple === true;
        case 'barcodes':
            return (product.barcodes ?? []).length > 0;
        default:
            return true;
    }
};

const matches = computed(() =>
    props.products.filter((product) => passesFilter(product) && matchesSearch(product, search.value))
);

// Grouped in the order you walk through a typical store; what has no category comes last.
const groups = computed(() =>
    [
        ...props.categories.map((category) => ({
            key: category.value,
            name: category.label,
            products: matches.value.filter((product) => product.microCategory === category.value),
        })),
        {
            key: UNCATEGORISED,
            name: 'Zonder categorie',
            products: matches.value.filter((product) => !isCategorised(product)),
        },
    ].filter((group) => group.products.length > 0)
);

const isQuickSorting = computed(() => filter.value === 'uncategorised');

const meta = (product: ProductInterface): string | undefined => {
    const parts = [
        product.isStaple ? 'Basisproduct' : null,
        product.purchasesCount ? `${product.purchasesCount}× gekocht` : null,
        (product.barcodes ?? []).length > 0 ? 'Barcode' : null,
    ].filter((part) => part !== null);

    return parts.length === 0 ? undefined : parts.join(' · ');
};

const sortInto = async (product: ProductInterface, category: string): Promise<void> => {
    if (category === '') {
        return;
    }

    sorting.value = [...sorting.value, product.identifier];

    try {
        await shopping.setCategory(product.identifier, category);
        emit('changed');
    } catch (error) {
        toast.failure(error);
    } finally {
        sorting.value = sorting.value.filter((identifier) => identifier !== product.identifier);
    }
};
</script>
<template>
    <section class="section-portal-products-product-list">
        <input-component
            v-model="search"
            type="search"
            placeholder="Zoek een product"
            autocomplete="off"
            class="search"
        />
        <div class="chips" role="radiogroup" aria-label="Filter">
            <button
                v-for="option in filters"
                :key="option.value"
                type="button"
                role="radio"
                class="chip"
                :class="{ 'is-active': filter === option.value }"
                :aria-checked="filter === option.value"
                @click="filter = option.value"
            >
                {{ option.label }}
            </button>
        </div>

        <template v-if="isQuickSorting">
            <p v-if="matches.length > 0" class="hint">
                Kies per product de categorie. Zo staat je lijst in de volgorde van de winkel.
            </p>
            <div class="rows">
                <list-row-component
                    v-for="product in matches"
                    :key="product.identifier"
                    :title="product.name"
                    clickable
                    @click="emit('open', product)"
                >
                    <template #trailing>
                        <select
                            class="sort"
                            :aria-label="`Categorie van ${product.name}`"
                            :disabled="sorting.includes(product.identifier)"
                            @click.stop
                            @change="sortInto(product, ($event.target as HTMLSelectElement).value)"
                        >
                            <option value="" selected disabled>Kies…</option>
                            <option v-for="category in categories" :key="category.value" :value="category.value">
                                {{ category.label }}
                            </option>
                        </select>
                    </template>
                </list-row-component>
            </div>
        </template>

        <template v-else>
            <div v-for="group in groups" :key="group.key" class="group">
                <div class="group-header">
                    <h2>{{ group.name }}</h2>
                    <span>{{ group.products.length }}</span>
                </div>
                <list-group-component>
                    <list-row-component
                        v-for="product in group.products"
                        :key="product.identifier"
                        :title="product.name"
                        :meta="meta(product)"
                        grouped
                        clickable
                        @click="emit('open', product)"
                    >
                        <template #trailing>
                            <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                        </template>
                    </list-row-component>
                </list-group-component>
            </div>
        </template>

        <p v-if="matches.length === 0" class="empty">
            {{ isQuickSorting && search.trim() === '' ? 'Alles heeft een categorie.' : 'Geen product gevonden.' }}
        </p>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/products/sections/product-list.css';
</style>
