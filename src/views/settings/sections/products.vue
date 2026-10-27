<script setup lang="ts">
import { computed, ref } from 'vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { matchesSearch } from '@/lib/productSearch';
import EditProduct from '@/views/settings/sections/edit-product.vue';

const props = defineProps<{
    products: ProductInterface[];
}>();

const emit = defineEmits<{
    changed: [];
}>();

// Every product ever typed ends up here, so without a search the list stays short.
const SHOWN_WITHOUT_SEARCH = 8;

const search = ref('');
const isShowingAll = ref(false);
const isSheetOpen = ref(false);
const selectedProduct = ref<ProductInterface | null>(null);

const matches = computed(() => props.products.filter((product) => matchesSearch(product, search.value)));

const shown = computed(() =>
    search.value.trim() !== '' || isShowingAll.value ? matches.value : matches.value.slice(0, SHOWN_WITHOUT_SEARCH)
);

const hiddenCount = computed(() => matches.value.length - shown.value.length);

const openProduct = (product: ProductInterface): void => {
    selectedProduct.value = product;
    isSheetOpen.value = true;
};
</script>
<template>
    <section v-if="props.products.length > 0" class="section-portal-settings-products">
        <section-label-component class="label">Producten</section-label-component>
        <p class="hint">Een tikfout of twee namen voor hetzelfde? Hernoem het product of voeg het samen met het juiste.</p>
        <input-component
            v-model="search"
            type="search"
            placeholder="Zoek een product"
            autocomplete="off"
            class="search"
        />
        <list-group-component v-if="shown.length > 0">
            <list-row-component
                v-for="product in shown"
                :key="product.identifier"
                :title="product.name"
                grouped
                clickable
                @click="openProduct(product)"
            >
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component v-if="hiddenCount > 0" grouped clickable class="more" @click="isShowingAll = true">
                <template #title>Toon nog {{ hiddenCount }} producten</template>
            </list-row-component>
        </list-group-component>
        <p v-else class="empty">Geen product gevonden.</p>
        <edit-product
            v-model:open="isSheetOpen"
            :product="selectedProduct"
            :products="props.products"
            @changed="emit('changed')"
        ></edit-product>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/products.css';
</style>
