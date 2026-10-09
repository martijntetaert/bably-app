<script setup lang="ts">
import { IonRippleEffect } from '@ionic/vue';
import { MealInterface } from '@/interfaces/MealInterface';

const props = defineProps<{
    meals: MealInterface[];
}>();

const whoEats = (meal: MealInterface): string => {
    const names = meal.eaters.map((eater) => eater.displayName).join(' en ');
    const count = `${meal.eaterCount} ${meal.eaterCount === 1 ? 'eter' : 'eters'}`;

    return names === '' ? count : `${names} · ${count}`;
};
</script>
<template>
    <router-link class="today-meal-component ion-activatable" to="/tabs/meals">
        <div class="label">Vanavond eten</div>
        <template v-if="props.meals.length > 0">
            <div v-for="meal in props.meals" :key="meal.identifier" class="dish">
                <div class="meal">{{ meal.name }}</div>
                <div class="for">{{ whoEats(meal) }}</div>
            </div>
        </template>
        <template v-else>
            <div class="meal">Nog niets gepland</div>
            <div class="for">Tik om iets op het weekmenu te zetten</div>
        </template>
        <ion-ripple-effect></ion-ripple-effect>
    </router-link>
</template>
<style scoped>
.today-meal-component {
    position: relative;
    overflow: hidden;
    display: block;
    padding: 1.125rem 1.25rem;
    border-radius: var(--bably-radius-card);
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
    text-decoration: none;
}

.label {
    font-size: 0.71875rem;
    font-weight: 600;
    letter-spacing: 0.056rem;
    text-transform: uppercase;
    opacity: 0.75;
}

.meal {
    margin-top: 0.4375rem;
    font-family: var(--bably-font-display);
    font-size: 1.3125rem;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.03rem;
}

.for {
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    opacity: 0.8;
}

.dish + .dish {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(var(--ion-color-primary-contrast-rgb), 0.2);
}
</style>
