<script setup lang="ts">
import { ref, watch } from 'vue';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import { shopping } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';

const props = defineProps<{
    item: GroceryItemInterface | null;
}>();

const emit = defineEmits<{
    saved: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();
const quantity = ref('');
const note = ref('');
const errors = ref<Record<string, string[]>>({});
const isSaving = ref(false);

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    errors.value = {};
    quantity.value = props.item?.quantity ?? '';
    note.value = props.item?.note ?? '';
});

// Quantity and note have an endpoint each; only what changed is sent.
const save = async (): Promise<void> => {
    const item = props.item;

    if (!item) {
        return;
    }

    isSaving.value = true;
    errors.value = {};
    const typedNote = note.value.trim() === '' ? null : note.value.trim();

    try {
        if (quantity.value.trim() !== (item.quantity ?? '')) {
            await shopping.quantity(item.identifier, quantity.value, item.identifiers);
        }

        if (typedNote !== item.note) {
            await Promise.all(item.identifiers.map((identifier) => shopping.note(identifier, typedNote)));
        }

        open.value = false;
        emit('saved');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        isSaving.value = false;
    }
};

const error = (): string | null => errors.value.quantity?.[0] ?? errors.value.note?.[0] ?? null;
</script>
<template>
    <section class="section-portal-shopping-item-editor">
        <drawer-component
            v-model:open="open"
            :title="item?.name ?? 'Aanpassen'"
            description="Hoeveel, en welk merk of formaat de ander moet nemen."
        >
            <form-component class="form" @submit="save()">
                <label class="field">
                    <span>Hoeveelheid</span>
                    <input-component
                        v-model="quantity"
                        name="quantity"
                        placeholder="bv. 2, 500 g, 1 groot pak"
                        autocomplete="off"
                    />
                </label>
                <label class="field">
                    <span>Notitie</span>
                    <input-component v-model="note" name="note" placeholder="bv. Merk Dreft" autocomplete="off" />
                </label>
                <p v-if="error()" class="error">
                    {{ error() }}
                </p>
                <button-component type="submit" :disabled="isSaving"> Bewaren </button-component>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/item-editor.css';
</style>
