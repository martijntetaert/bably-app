<script setup lang="ts">
import { ref } from 'vue';
import ActionBarComponent from '@/components/action-bar-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
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
        failure.value =
            error instanceof ApiError ? error.firstError('url') ?? error.message : 'Deze link kon Bably niet lezen.';
    } finally {
        isImporting.value = false;
    }
};
</script>
<template>
    <section class="section-portal-meals-recipe-bar">
        <action-bar-component>
            <form-component class="form" @submit="importRecipe()">
                <input-component
                    v-model="url"
                    class="input"
                    type="text"
                    name="url"
                    placeholder="Plak een recept-link…"
                    autocomplete="off"
                />
                <button-component variant="secondary" type="submit" :disabled="isImporting || url.trim() === ''">
                    {{ isImporting ? 'Lezen…' : 'Importeer' }}
                </button-component>
            </form-component>
            <p v-if="failure" class="error">{{ failure }}</p>
            <button-component @click="emit('newRecipe')"> Nieuw recept </button-component>
        </action-bar-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/recipe-bar.css';
</style>
