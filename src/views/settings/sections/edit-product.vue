<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { shopping } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { matchesSearch } from '@/lib/productSearch';

const props = defineProps<{
    product: ProductInterface | null;
    products: ProductInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const MERGE_CANDIDATES_SHOWN = 5;

const toast = useToast();

const name = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

const mergeSearch = ref('');
const mergeTarget = ref<ProductInterface | null>(null);
const isConfirming = ref(false);
const isMerging = ref(false);

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

const askToMerge = (target: ProductInterface): void => {
    mergeTarget.value = target;
    isConfirming.value = true;
};

const merge = async (): Promise<void> => {
    if (!props.product || !mergeTarget.value) {
        return;
    }

    isMerging.value = true;

    try {
        await shopping.mergeProduct(props.product.identifier, mergeTarget.value.identifier);
        toast.success(`${props.product.name} is samengevoegd met ${mergeTarget.value.name}.`);
        emit('changed');
        isConfirming.value = false;
        open.value = false;
    } catch (error) {
        isConfirming.value = false;
        toast.failure(error);
    } finally {
        isMerging.value = false;
    }
};
</script>
<template>
    <section class="section-portal-settings-edit-product">
        <drawer-component
            v-model:open="open"
            title="Product bewerken"
            description="Een nieuwe naam geldt overal: op de lijst, in je recepten en in de route."
        >
            <form-component class="form" @submit="rename()">
                <div class="field">
                    <section-label-component>Naam</section-label-component>
                    <input-component v-model="name" name="product" autocomplete="off" required />
                    <p v-if="errors.name" class="error">
                        {{ errors.name[0] }}
                    </p>
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
                            @click="askToMerge(candidate)"
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
            v-if="product && mergeTarget"
            v-model:open="isConfirming"
            title="Samenvoegen?"
            :description="`${product.name} gaat op in ${mergeTarget.name}: de lijst, de aankopen, de recepten en de plaats in de winkel. ${product.name} verdwijnt.`"
            confirm-label="Samenvoegen"
            :processing="isMerging"
            @confirm="merge()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/edit-product.css';
</style>
