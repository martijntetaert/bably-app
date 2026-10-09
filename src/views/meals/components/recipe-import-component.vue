<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonInput, IonSpinner } from '@ionic/vue';
import { recipes } from '@/api/bably';
import { ApiError } from '@/api/client';
import { RecipeDraftInterface } from '@/interfaces/RecipeInterface';

const emit = defineEmits<{
    imported: [draft: RecipeDraftInterface];
    newRecipe: [];
}>();

const url = ref('');
const isImporting = ref(false);
const failure = ref<string | null>(null);

const importRecipe = async (): Promise<void> => {
    if (url.value.trim() === '' || isImporting.value) {
        return;
    }

    failure.value = null;
    isImporting.value = true;

    try {
        const { recipe } = await recipes.import(url.value.trim());
        emit('imported', { ...recipe, identifier: null });
        url.value = '';
    } catch (error) {
        failure.value = error instanceof ApiError ? (error.firstError('url') ?? error.message) : 'Deze link kon Bably niet lezen.';
    } finally {
        isImporting.value = false;
    }
};
</script>
<template>
    <section class="recipe-import">
        <form class="form" @submit.prevent="importRecipe()">
            <ion-input
                v-model="url"
                class="input"
                type="url"
                inputmode="url"
                placeholder="Plak een recept-link…"
                aria-label="Recept-link"
                autocomplete="off"
                enterkeyhint="go"
                fill="outline"
            />
            <ion-button type="submit" fill="outline" :disabled="isImporting || url.trim() === ''">
                <ion-spinner v-if="isImporting" name="dots" />
                <template v-else>Importeer</template>
            </ion-button>
        </form>
        <p v-if="failure" class="error">{{ failure }}</p>
        <ion-button expand="block" @click="emit('newRecipe')">Nieuw recept</ion-button>
    </section>
</template>
<style scoped>
.recipe-import {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
    border: 1px solid var(--bably-border);
}

.form {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.input {
    flex: 1;
    --border-radius: var(--bably-radius-row);
}

.form ion-button {
    margin: 0;
    min-width: 6.5rem;
}

.error {
    margin: 0;
    color: var(--ion-color-danger);
    font-size: 0.85rem;
}
</style>
