<script setup lang="ts">
import { computed, ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { shopping as shoppingApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import PortalPageComponent from '@/components/portal-page-component.vue';
import { MicroCategoryInterface } from '@/interfaces/MicroCategoryInterface';
import { ProductInterface } from '@/interfaces/ProductInterface';
import ProductsHeader from '@/views/products/sections/products-header.vue';
import ProductList from '@/views/products/sections/product-list.vue';
import ProductSheet from '@/views/products/sections/product-sheet.vue';

const toast = useToast();

const products = ref<ProductInterface[] | null>(null);
const categories = ref<MicroCategoryInterface[]>([]);
const selectedIdentifier = ref<string | null>(null);
const isSheetOpen = ref(false);

// The sheet follows the list, so a change made in it shows right away after the reload.
const selectedProduct = computed(
    () => products.value?.find((product) => product.identifier === selectedIdentifier.value) ?? null
);

const subtitle = computed(() => {
    const count = products.value?.length ?? 0;

    return `${count} ${count === 1 ? 'product' : 'producten'} die je ooit op de lijst zette`;
});

const loadProducts = async (): Promise<void> => {
    products.value = await shoppingApi.products();
};

// The categories are a fixed list, so they are fetched once.
const loadCategories = async (): Promise<void> => {
    if (categories.value.length === 0) {
        categories.value = await shoppingApi.microCategories();
    }
};

const reload = async (): Promise<void> => {
    try {
        await Promise.all([loadProducts(), loadCategories()]);
    } catch (error) {
        toast.failure(error);
    }
};

const reloadProducts = async (): Promise<void> => {
    try {
        await loadProducts();
    } catch (error) {
        toast.failure(error);
    }
};

const openProduct = (product: ProductInterface): void => {
    selectedIdentifier.value = product.identifier;
    isSheetOpen.value = true;
};

onIonViewWillEnter(reload);
</script>
<template>
    <portal-page-component :refresh="reload">
        <div id="page-portal-products-overview">
            <products-header :subtitle="subtitle"></products-header>
            <div v-if="products === null" class="skeleton" aria-busy="true">
                <span v-for="row in 6" :key="row" class="row"></span>
            </div>
            <product-list
                v-else
                :products="products"
                :categories="categories"
                @open="openProduct"
                @changed="reloadProducts()"
            ></product-list>
            <product-sheet
                v-model:open="isSheetOpen"
                :product="selectedProduct"
                :products="products ?? []"
                :categories="categories"
                @changed="reloadProducts()"
            ></product-sheet>
        </div>
    </portal-page-component>
</template>
<style scoped>
@import '@css/pages/portal/products/overview.css';

#page-portal-products-overview {
    .skeleton {
        @apply flex flex-col gap-1.5;

        .row {
            @apply rounded-row bg-muted h-13 animate-pulse;
        }
    }
}
</style>
