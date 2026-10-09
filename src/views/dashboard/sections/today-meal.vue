<script setup lang="ts">
import PortletComponent from '@/components/portlet-component.vue';
import { MealInterface } from '@/interfaces/MealInterface';

defineProps<{
    meals: MealInterface[];
}>();

const whoEats = (meal: MealInterface): string => {
    const names = meal.eaters.map((eater) => eater.displayName).join(' en ');
    const count = `${meal.eaterCount} ${meal.eaterCount === 1 ? 'eter' : 'eters'}`;

    return names === '' ? count : `${names} · ${count}`;
};
</script>
<template>
    <section class="section-portal-dashboard-today-meal">
        <router-link to="/tabs/meals">
            <portlet-component color="dark">
                <template #content>
                    <div class="label">Vanavond eten</div>
                    <template v-if="meals.length > 0">
                        <div v-for="meal in meals" :key="meal.identifier" class="dish">
                            <div class="meal">{{ meal.name }}</div>
                            <div class="for">{{ whoEats(meal) }}</div>
                        </div>
                    </template>
                    <template v-else>
                        <div class="meal">Nog niets gepland</div>
                        <div class="for">Tik om iets op het weekmenu te zetten</div>
                    </template>
                </template>
            </portlet-component>
        </router-link>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/today-meal.css';
</style>
