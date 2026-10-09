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
const note = ref('');
const errors = ref<Record<string, string[]>>({});
const isSaving = ref(false);

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    errors.value = {};
    note.value = props.item?.note ?? '';
});

const save = async (): Promise<void> => {
    if (!props.item) {
        return;
    }

    isSaving.value = true;
    errors.value = {};
    const text = note.value.trim() === '' ? null : note.value.trim();

    try {
        await Promise.all(props.item.identifiers.map((identifier) => shopping.note(identifier, text)));
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

const wipe = (): void => {
    note.value = '';
    void save();
};
</script>
<template>
    <section class="section-portal-shopping-item-note">
        <drawer-component
            v-model:open="open"
            :title="item?.name ?? 'Notitie'"
            description="Merk, formaat of wat de ander moet weten."
        >
            <form-component class="form" @submit="save()">
                <input-component
                    v-model="note"
                    name="note"
                    placeholder="bv. Merk Dreft, groot pak"
                    autocomplete="off"
                />
                <p v-if="errors.note" class="error">
                    {{ errors.note[0] }}
                </p>
                <div class="actions">
                    <button-component
                        v-if="item?.note"
                        variant="secondary"
                        class="wipe"
                        :disabled="isSaving"
                        @click="wipe()"
                    >
                        Wissen
                    </button-component>
                    <button-component type="submit" class="save" :disabled="isSaving"> Bewaren </button-component>
                </div>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/item-note.css';
</style>
