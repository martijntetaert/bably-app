<script setup lang="ts">
import { DateTime } from 'luxon';
import StepperComponent from '@/components/stepper-component.vue';
import { meals } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { MealDayInterface, MealInterface } from '@/interfaces/MealInterface';

const props = defineProps<{
    days: MealDayInterface[];
    today: string;
}>();

const emit = defineEmits<{
    show: [meal: MealInterface];
    plan: [date: string];
    changed: [];
}>();

const toast = useToast();

const weekday = (date: string): string => DateTime.fromISO(date).setLocale('nl-BE').toFormat('ccc');

const dayNumber = (date: string): number => DateTime.fromISO(date).day;

const isPast = (date: string): boolean => date < props.today;

const whoEats = (meal: MealInterface): string => {
    const names = meal.eaters.map((eater) => eater.displayName);
    const people = names.length === 0 ? 'nog niemand' : names.join(' en ');

    const table = meal.guests === 0 ? people : `${people} + ${meal.guests} ${meal.guests === 1 ? 'gast' : 'gasten'}`;

    if (meal.leftoverOf) {
        return `${table} · restje van ${weekday(meal.leftoverOf.eatenOn)}`;
    }

    if (meal.leftovers.length > 0) {
        return `${table} · kook voor ${meal.portions}`;
    }

    return table;
};

// The stepper counts everyone at the table; the household members are set in the sheet,
// so the stepper changes the number of guests. The count moves before the request so a
// quick series of taps does not wait on the network.
const setEaterCount = async (meal: MealInterface, count: number): Promise<void> => {
    const guests = Math.max(0, count - meal.eaters.length);
    meal.portions += guests - meal.guests;
    meal.guests = guests;
    meal.eaterCount = count;

    try {
        await meals.update(meal.identifier, { guests });
    } catch (error) {
        toast.failure(error);
    } finally {
        emit('changed');
    }
};
</script>
<template>
    <section class="section-portal-meals-week-menu">
        <div
            v-for="day in days"
            :key="day.date"
            class="day"
            :class="{
                'is-empty': day.meals.length === 0,
                'is-today': day.date === today,
                'is-past': isPast(day.date),
            }"
        >
            <div class="date">
                <span class="weekday">{{ weekday(day.date) }}</span>
                <span class="number">{{ dayNumber(day.date) }}</span>
            </div>
            <div class="dishes">
                <div v-for="meal in day.meals" :key="meal.identifier" class="dish">
                    <button type="button" class="what" @click="emit('show', meal)">
                        <span class="name">{{ meal.name }}</span>
                        <span class="for">{{ whoEats(meal) }}</span>
                    </button>
                    <stepper-component
                        :model-value="meal.eaterCount"
                        :min="meal.eaters.length"
                        :max="meal.eaters.length + 20"
                        :label="`Eters voor ${meal.name}`"
                        :unit="meal.eaterCount === 1 ? 'eter' : 'eters'"
                        @update:model-value="setEaterCount(meal, $event)"
                    ></stepper-component>
                </div>
                <button v-if="day.meals.length === 0" type="button" class="empty" @click="emit('plan', day.date)">
                    <span class="name">Nog niets gepland</span>
                    <span class="for">Tik om iets te kiezen</span>
                </button>
                <button v-else type="button" class="add" @click="emit('plan', day.date)">+ Nog een gerecht</button>
            </div>
        </div>
        <p class="hint">
            Eet iemand iets anders? Zet er een tweede gerecht bij —<br />elk gerecht schaalt op zijn eigen eters.
        </p>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/week-menu.css';
</style>
