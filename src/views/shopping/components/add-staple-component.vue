<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonIcon, IonInput, IonSpinner } from '@ionic/vue';
import { add } from 'ionicons/icons';
import { shopping } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';

const emit = defineEmits<{
    added: [];
}>();

const toast = useToast();
const name = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const submit = async (): Promise<void> => {
    if (name.value.trim() === '') {
        return;
    }

    busy.value = true;
    errors.value = {};

    try {
        await shopping.addStaple(name.value.trim());
        name.value = '';
        emit('added');
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
</script>
<template>
    <section class="add-staple">
        <form class="form" @submit.prevent="submit()">
            <ion-input
                v-model="name"
                fill="outline"
                placeholder="Product in je voorraad…"
                autocomplete="off"
                enterkeyhint="done"
                aria-label="Product in je voorraad"
                :class="{ 'ion-invalid ion-touched': errors.name }"
            ></ion-input>
            <ion-button type="submit" :disabled="busy || name.trim() === ''" aria-label="Aan je voorraad toevoegen">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                <ion-icon v-else slot="icon-only" :icon="add"></ion-icon>
            </ion-button>
        </form>
        <p v-if="errors.name" class="error">{{ errors.name[0] }}</p>
    </section>
</template>
<style scoped>
.add-staple {
    padding: 0.625rem 1rem calc(0.625rem + var(--ion-safe-area-bottom, 0px));
    border-top: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

ion-input {
    --border-radius: 0.875rem;
    --background: var(--bably-muted);
    flex: 1;
    min-height: 3rem;
}

ion-button {
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
</style>
