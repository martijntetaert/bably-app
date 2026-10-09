<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonIcon, IonInput, IonSpinner } from '@ionic/vue';
import { add, repeat } from 'ionicons/icons';
import { tasks } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';

const emit = defineEmits<{
    added: [];
    detail: [title: string];
}>();

const toast = useToast();

const title = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

const submit = async (): Promise<void> => {
    if (title.value.trim() === '' || busy.value) {
        return;
    }

    busy.value = true;
    error.value = null;

    try {
        await tasks.create({ title: title.value.trim() });
        title.value = '';
        emit('added');
    } catch (exception) {
        if (exception instanceof ApiError && exception.status === 422) {
            error.value = exception.firstError('title') ?? exception.message;
        } else {
            await toast.failure(exception);
        }
    } finally {
        busy.value = false;
    }
};

const openDetail = (): void => {
    emit('detail', title.value.trim());
    title.value = '';
    error.value = null;
};
</script>
<template>
    <form class="quick-add" @submit.prevent="submit">
        <ion-input
            v-model="title"
            class="input"
            placeholder="Nieuwe taak…"
            aria-label="Nieuwe taak"
            autocapitalize="sentences"
            enterkeyhint="done"
            fill="outline"
            :class="{ 'ion-invalid ion-touched': error }"
            :error-text="error ?? undefined"
        ></ion-input>
        <ion-button fill="outline" aria-label="Met herhaling" @click="openDetail">
            <ion-icon slot="icon-only" :icon="repeat"></ion-icon>
        </ion-button>
        <ion-button type="submit" aria-label="Taak toevoegen" :disabled="busy || title.trim() === ''">
            <ion-spinner v-if="busy" name="crescent"></ion-spinner>
            <ion-icon v-else slot="icon-only" :icon="add"></ion-icon>
        </ion-button>
    </form>
</template>
<style scoped>
.quick-add {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
}

.input {
    flex: 1;
    --border-radius: 999px;
    --background: var(--bably-card);
}

ion-button {
    --border-radius: 999px;
    height: 3.5rem;
    margin: 0;
}
</style>
