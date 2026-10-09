<script setup lang="ts">
import { chevronForward, restaurantOutline } from '@/lib/icons';
import { RecipeInterface } from '@/interfaces/RecipeInterface';

defineProps<{
    recipes: RecipeInterface[];
}>();

const emit = defineEmits<{
    edit: [recipe: RecipeInterface];
}>();

const meta = (recipe: RecipeInterface): string =>
    `Basis ${recipe.baseServings} ${recipe.baseServings === 1 ? 'portie' : 'porties'} · ${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'ingrediënt' : 'ingrediënten'}`;
</script>
<template>
    <section class="recipe-list">
        <button v-for="recipe in recipes" :key="recipe.identifier" type="button" class="recipe" @click="emit('edit', recipe)">
            <img v-if="recipe.photoUrl" class="thumbnail" :src="recipe.photoUrl" alt="" loading="lazy" />
            <span v-else class="thumbnail is-empty">
                <i :class="restaurantOutline" aria-hidden="true"></i>
            </span>
            <span class="what">
                <span class="name">{{ recipe.name }}</span>
                <span class="meta">{{ meta(recipe) }}</span>
            </span>
            <i class="chevron" :class="chevronForward" aria-hidden="true"></i>
        </button>
        <p v-if="recipes.length === 0" class="empty">Nog geen recepten. Plak hierboven een link naar een recept, of maak er zelf een.</p>
    </section>
</template>
<style scoped>
.recipe-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recipe {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.65rem 0.75rem;
    font: inherit;
    color: inherit;
    text-align: left;
    border-radius: var(--bably-radius-row);
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.thumbnail {
    width: 3rem;
    height: 3rem;
    flex-shrink: 0;
    border-radius: 0.8rem;
    object-fit: cover;
}

.thumbnail.is-empty {
    display: grid;
    place-items: center;
    background: var(--bably-muted);
    color: var(--bably-meals);
    font-size: 1.25rem;
}

.what {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.name {
    font-weight: 600;
    overflow-wrap: anywhere;
}

.meta {
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}

.chevron {
    color: var(--bably-muted-text);
}

.empty {
    text-align: center;
    color: var(--bably-muted-text);
    font-size: 0.9rem;
}
</style>
