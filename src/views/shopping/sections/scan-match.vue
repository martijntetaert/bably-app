<script setup lang="ts">
import { computed, ref } from 'vue';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { shopping as shoppingApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { BarcodeInterface } from '@/interfaces/BarcodeInterface';
import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';
import { findRowForProduct } from '@/lib/barcodes';

const props = defineProps<{
    groups: GroceryGroupInterface[];
}>();

const emit = defineEmits<{
    tick: [item: GroceryItemInterface];
    added: [ean: string];
}>();

const toast = useToast();
const open = ref(false);
const scanned = ref<BarcodeInterface | null>(null);
const name = ref('');
const isProcessing = ref(false);

const openRows = computed(() => props.groups.flatMap((group) => group.items).filter((item) => !item.checked));

const title = computed(() => scanned.value?.product?.name ?? scanned.value?.name ?? 'Onbekende barcode');

const description = computed(() =>
    scanned.value?.product || scanned.value?.name
        ? 'Staat het onder een andere naam op je lijst? Tik het aan, dan onthoudt Bably de barcode.'
        : 'Bably kent deze barcode nog niet. Tik aan welk product het is, dan onthoudt Bably de barcode.'
);

// Without a known name the server cannot make a product, so one has to be typed.
const needsName = computed(() => !scanned.value?.product && !scanned.value?.name);

/**
 * Called when the scan matched no row on the phone. Looking the barcode up needs a
 * connection; without one the shopper ticks it by hand.
 */
const resolve = async (ean: string): Promise<void> => {
    let found: BarcodeInterface;

    try {
        found = await shoppingApi.lookUpBarcode(ean);
    } catch (error) {
        if (error instanceof ApiError && error.isOffline) {
            toast.info('Zonder bereik herkent Bably deze barcode nog niet. Vink het product zelf af.');
        } else if (error instanceof ApiError && error.firstError('ean') !== null) {
            toast.info(error.firstError('ean') ?? error.message);
        } else {
            toast.failure(error);
        }

        return;
    }

    const row = found.product ? findRowForProduct(props.groups, found.product.identifier) : null;

    if (row) {
        emit('tick', row);

        return;
    }

    scanned.value = found;
    name.value = '';
    open.value = true;
};

defineExpose({ resolve });

const linkTo = async (item: GroceryItemInterface): Promise<void> => {
    const ean = scanned.value?.ean;

    if (!ean) {
        return;
    }

    open.value = false;
    emit('tick', item);

    try {
        await shoppingApi.linkBarcode(item.productIdentifier, ean);
    } catch (error) {
        toast.failure(error);
    }
};

const addAndTick = async (): Promise<void> => {
    const ean = scanned.value?.ean;

    if (!ean || (needsName.value && name.value.trim() === '')) {
        return;
    }

    isProcessing.value = true;

    try {
        await shoppingApi.add({ barcode: ean, ...(name.value.trim() === '' ? {} : { name: name.value.trim() }) });
        open.value = false;
        emit('added', ean);
    } catch (error) {
        toast.failure(error);
    } finally {
        isProcessing.value = false;
    }
};
</script>
<template>
    <section class="section-portal-shopping-scan-match">
        <drawer-component v-model:open="open" :title="title" :description="description">
            <div class="match">
                <list-group-component v-if="openRows.length > 0">
                    <list-row-component
                        v-for="item in openRows"
                        :key="item.identifier"
                        :title="item.name"
                        :meta="item.quantity ?? undefined"
                        grouped
                        clickable
                        @click="linkTo(item)"
                    >
                        <template #trailing>
                            <i class="fa-solid fa-check tick" aria-hidden="true"></i>
                        </template>
                    </list-row-component>
                </list-group-component>

                <form-component class="form" @submit="addAndTick()">
                    <section-label-component>Niet op je lijst?</section-label-component>
                    <input-component
                        v-if="!scanned?.product"
                        v-model="name"
                        name="product"
                        :placeholder="scanned?.name ?? 'Naam van het product'"
                        autocomplete="off"
                        :required="needsName"
                    />
                    <button-component
                        type="submit"
                        variant="soft"
                        icon="fa-solid fa-basket-shopping"
                        :disabled="isProcessing || (needsName && name.trim() === '')"
                    >
                        Toevoegen en afvinken
                    </button-component>
                </form-component>
            </div>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/scan-match.css';
</style>
