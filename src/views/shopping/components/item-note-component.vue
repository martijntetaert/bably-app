<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonButton, IonInput, IonModal, IonSpinner } from '@ionic/vue';
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
const busy = ref(false);
const input = ref<InstanceType<typeof IonInput> | null>(null);

watch(open, (isOpen) => {
    if (isOpen) {
        errors.value = {};
        note.value = props.item?.note ?? '';
    }
});

const save = async (value: string): Promise<void> => {
    if (props.item === null) {
        return;
    }

    busy.value = true;
    errors.value = {};
    const text = value.trim() === '' ? null : value.trim();

    try {
        await Promise.all(props.item.identifiers.map((identifier) => shopping.note(identifier, text)));
        open.value = false;
        emit('saved');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        busy.value = false;
    }
};

const focusInput = (): void => {
    void input.value?.$el.setFocus();
};
</script>
<template>
    <ion-modal
        :is-open="open"
        class="sheet"
        :initial-breakpoint="1"
        :breakpoints="[0, 1]"
        @did-present="focusInput"
        @did-dismiss="open = false"
    >
        <div class="sheet-body">
            <h2>{{ item?.name ?? 'Notitie' }}</h2>
            <p class="description">Merk, formaat of wat de ander moet weten.</p>
            <form @submit.prevent="save(note)">
                <ion-input
                    ref="input"
                    v-model="note"
                    fill="outline"
                    placeholder="bv. Merk Dreft, groot pak"
                    autocomplete="off"
                    aria-label="Notitie"
                    :class="{ 'ion-invalid ion-touched': errors.note }"
                    :error-text="errors.note?.[0]"
                ></ion-input>
                <div class="actions">
                    <ion-button v-if="item?.note" fill="outline" color="medium" :disabled="busy" @click="save('')">Wissen</ion-button>
                    <ion-button type="submit" :disabled="busy">
                        <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                        <span v-else>Bewaren</span>
                    </ion-button>
                </div>
            </form>
        </div>
    </ion-modal>
</template>
<style scoped>
.sheet {
    --height: auto;
    --border-radius: var(--bably-radius-card);
}

.sheet :deep(.ion-delegate-host) {
    position: relative;
    display: block;
    contain: content;
}

.sheet-body {
    max-height: 85vh;
    overflow-y: auto;
    padding: 1rem 1rem calc(1.25rem + var(--ion-safe-area-bottom, 0px));
}

h2 {
    margin: 0.5rem 0 0.25rem;
    font-size: 1.25rem;
}

.description {
    margin: 0 0 1rem;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
}
</style>
