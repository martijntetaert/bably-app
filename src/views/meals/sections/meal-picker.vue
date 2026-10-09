<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import { meals } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { RecipeInterface } from '@/interfaces/RecipeInterface';

const props = defineProps<{
    date: string | null;
    recipes: RecipeInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    planned: [];
    newRecipe: [];
}>();

const toast = useToast();
const search = ref('');
const isPlanning = ref(false);

const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const day = computed(() => (props.date ? DateTime.fromISO(props.date).setLocale('nl-BE').toFormat('cccc d MMMM') : ''));

const matches = computed(() => props.recipes.filter((recipe) => plain(recipe.name).includes(plain(search.value))));

watch(open, (isOpen) => {
    if (isOpen) {
        search.value = '';
    }
});

const plan = async (data: { recipeIdentifier?: string; name?: string }): Promise<void> => {
    if (props.date === null || isPlanning.value) {
        return;
    }

    isPlanning.value = true;

    try {
        await meals.plan({ eatenOn: props.date, ...data });
        open.value = false;
        emit('planned');
    } catch (error) {
        toast.failure(error);
    } finally {
        isPlanning.value = false;
    }
};
</script>
<template>
    <section class="section-portal-meals-meal-picker">
        <drawer-component v-model:open="open" title="Wat eten we?" :description="day">
            <div class="picker">
                <input
                    v-model="search"
                    class="search"
                    type="text"
                    placeholder="Zoek een recept of typ een gerecht…"
                    autocomplete="off"
                    aria-label="Recept zoeken"
                    enterkeyhint="go"
                    @keydown.enter.prevent="
                        matches[0]
                            ? plan({ recipeIdentifier: matches[0].identifier })
                            : search.trim() && plan({ name: search.trim() })
                    "
                />
                <ul class="recipes">
                    <li v-for="recipe in matches" :key="recipe.identifier">
                        <button
                            type="button"
                            :disabled="isPlanning"
                            @click="plan({ recipeIdentifier: recipe.identifier })"
                        >
                            <span class="what">
                                <span class="name">{{ recipe.name }}</span>
                                <span class="meta">
                                    Basis {{ recipe.baseServings }} · {{ recipe.ingredients.length }} ingrediënten
                                </span>
                            </span>
                            <span class="plan">Plan in</span>
                        </button>
                    </li>
                    <li v-if="search.trim() !== '' && matches.length === 0">
                        <button type="button" :disabled="isPlanning" @click="plan({ name: search.trim() })">
                            <span class="what">
                                <span class="name">‘{{ search.trim() }}’</span>
                                <span class="meta"> Zonder recept, er komt niets op de lijst </span>
                            </span>
                            <span class="plan">Plan in</span>
                        </button>
                    </li>
                </ul>
                <p v-if="recipes.length === 0" class="hint">
                    Nog geen recepten. Maak er een, of typ hierboven een gerecht zonder recept.
                </p>
                <button-component variant="secondary" @click="emit('newRecipe')"> Nieuw recept </button-component>
            </div>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/meal-picker.css';
</style>
