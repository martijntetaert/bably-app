<script setup lang="ts">
import { DateTime } from 'luxon';
import { meals } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { MealDayInterface, MealInterface } from '@/interfaces/MealInterface';
import StepperComponent from '@/views/meals/components/stepper-component.vue';

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
// so the stepper changes the number of guests.
const setEaterCount = async (meal: MealInterface, count: number): Promise<void> => {
    const guests = Math.max(0, count - meal.eaters.length);
    meal.portions += guests - meal.guests;
    meal.guests = guests;
    meal.eaterCount = count;

    try {
        await meals.update(meal.identifier, { guests });
    } catch (error) {
        await toast.failure(error);
    } finally {
        emit('changed');
    }
};
</script>
<template>
    <section class="week-menu">
        <div
            v-for="day in days"
            :key="day.date"
            class="day"
            :class="{ 'is-empty': day.meals.length === 0, 'is-today': day.date === today, 'is-past': isPast(day.date) }"
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
                    />
                </div>
                <button v-if="day.meals.length === 0" type="button" class="empty" @click="emit('plan', day.date)">
                    <span class="name">Nog niets gepland</span>
                    <span class="for">Tik om iets te kiezen</span>
                </button>
                <button v-else type="button" class="add" @click="emit('plan', day.date)">+ Nog een gerecht</button>
            </div>
        </div>
        <p class="hint">Eet iemand iets anders? Zet er een tweede gerecht bij — elk gerecht schaalt op zijn eigen eters.</p>
    </section>
</template>
<style scoped>
.week-menu {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.day {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: var(--bably-radius-card);
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.day.is-today {
    border-color: var(--bably-today);
    box-shadow: 0 0 0 1px var(--bably-today);
}

.day.is-past {
    opacity: 0.6;
}

.date {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    flex-shrink: 0;
    border-radius: var(--bably-radius-row);
    background: var(--bably-muted);
    padding: 0.35rem 0;
    align-self: flex-start;
}

.is-today .date {
    background: var(--bably-today);
    color: var(--ion-color-primary-contrast);
}

.weekday {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.number {
    font-family: var(--bably-font-display);
    font-size: 1.2rem;
    font-weight: 700;
}

.dishes {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
}

.dish {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    text-align: left;
}

.what,
.empty {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0;
}

.name {
    font-weight: 600;
    color: var(--bably-meals);
    overflow-wrap: anywhere;
}

.empty .name {
    color: var(--bably-muted-text);
    font-weight: 500;
}

.for {
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}

.add {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ion-color-primary);
    padding: 0.25rem 0;
}

.hint {
    margin: 0.5rem 0 0;
    text-align: center;
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}
</style>
