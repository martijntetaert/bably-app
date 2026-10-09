<script setup lang="ts">
import ListRowComponent from '@/components/list-row-component.vue';
import { RecipeInterface } from '@/interfaces/RecipeInterface';

defineOptions({ name: 'MealsRecipes' });

defineProps<{
    recipes: RecipeInterface[];
}>();

const emit = defineEmits<{
    edit: [recipe: RecipeInterface];
}>();

const meta = (recipe: RecipeInterface): string =>
    `Basis ${recipe.baseServings} ${recipe.baseServings === 1 ? 'portie' : 'porties'} · ${recipe.ingredients.length} ${
        recipe.ingredients.length === 1 ? 'ingrediënt' : 'ingrediënten'
    }`;
</script>
<template>
    <section class="section-portal-meals-recipes">
        <list-row-component
            v-for="recipe in recipes"
            :key="recipe.identifier"
            :title="recipe.name"
            :meta="meta(recipe)"
            clickable
            @click="emit('edit', recipe)"
        >
            <template #leading>
                <img v-if="recipe.photoUrl" class="thumbnail" :src="recipe.photoUrl" alt="" loading="lazy" />
                <span v-else class="thumbnail is-empty">
                    <i class="fa-solid fa-utensils" aria-hidden="true"></i>
                </span>
            </template>
            <template #trailing>
                <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
            </template>
        </list-row-component>
        <p v-if="recipes.length === 0" class="empty">
            Nog geen recepten. Plak hieronder een link naar een recept, of maak er zelf een.
        </p>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/recipes.css';
</style>
