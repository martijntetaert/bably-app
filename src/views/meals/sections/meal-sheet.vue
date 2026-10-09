<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { DateTime } from 'luxon';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import StepperComponent from '@/components/stepper-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { meals, shopping, type MealFields } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { MealInterface } from '@/interfaces/MealInterface';
import { UserInterface } from '@/interfaces/UserInterface';

const props = defineProps<{
    meal: MealInterface | null;
    members: UserInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    editRecipe: [identifier: string];
    cook: [meal: MealInterface];
    changed: [];
}>();

const toast = useToast();

const isConfirmingRemoval = ref(false);
const isRemoving = ref(false);
const dayInput = useTemplateRef<HTMLInputElement>('dayInput');

const day = computed(() =>
    props.meal ? DateTime.fromISO(props.meal.eatenOn).setLocale('nl-BE').toFormat('cccc d MMMM') : ''
);

const weekdayOf = (date: string): string => DateTime.fromISO(date).setLocale('nl-BE').toFormat('cccc');

const description = computed(() => {
    if (!props.meal?.leftoverOf) {
        return day.value;
    }

    return `${day.value} · restje van ${weekdayOf(props.meal.leftoverOf.eatenOn)}`;
});

// The next days of the week the pot can still be eaten on, those already planned left out.
const laterDays = computed(() => {
    if (!props.meal || props.meal.leftoverOf) {
        return [];
    }

    const planned = props.meal.leftovers.map((leftover) => leftover.eatenOn);

    return [1, 2, 3]
        .map((offset) => DateTime.fromISO(props.meal?.eatenOn ?? '').plus({ days: offset }))
        .filter((date) => !planned.includes(date.toISODate() ?? ''))
        .map((date) => ({
            date: date.toISODate() ?? '',
            label: date.setLocale('nl-BE').toFormat('ccc d'),
        }));
});

const run = async (action: () => Promise<unknown>): Promise<void> => {
    try {
        await action();
    } catch (error) {
        toast.failure(error);
    } finally {
        emit('changed');
    }
};

const eatAgainOn = (date: string): void => {
    const meal = props.meal;

    if (meal) {
        void run(() => meals.planLeftover(meal.identifier, { eatenOn: date }));
    }
};

const eats = (member: UserInterface): boolean =>
    props.meal?.eaters.some((eater) => eater.identifier === member.identifier) ?? false;

const toBuy = computed(() => props.meal?.ingredients.filter((ingredient) => !ingredient.staple) ?? []);

const fromStaples = computed(() => props.meal?.ingredients.filter((ingredient) => ingredient.staple) ?? []);

// Takes the product out of the staples, so this and every other dish puts it on the list again.
const putOnList = (ingredient: IngredientLineInterface): void => {
    const product = ingredient.productIdentifier;

    if (product) {
        void run(() => shopping.setStaple(product, false));
    }
};

const update = (data: MealFields): void => {
    const meal = props.meal;

    if (meal) {
        void run(() => meals.update(meal.identifier, data));
    }
};

const toggleEater = (member: UserInterface): void => {
    const eaters = props.meal?.eaters.map((eater) => eater.identifier) ?? [];

    update({
        eaterIdentifiers: eats(member)
            ? eaters.filter((identifier) => identifier !== member.identifier)
            : [...eaters, member.identifier],
    });
};

const moveToTomorrow = (): void => {
    if (!props.meal) {
        return;
    }

    update({ eatenOn: DateTime.fromISO(props.meal.eatenOn).plus({ days: 1 }).toISODate() ?? undefined });
};

const chooseDay = (): void => {
    const input = dayInput.value;

    if (!input) {
        return;
    }

    try {
        input.showPicker();
    } catch {
        input.click();
    }
};

const moveTo = (date: string): void => {
    if (date !== '' && date !== props.meal?.eatenOn) {
        update({ eatenOn: date });
    }
};

const remove = async (): Promise<void> => {
    const meal = props.meal;

    if (!meal) {
        return;
    }

    isRemoving.value = true;

    try {
        await meals.remove(meal.identifier);
        isConfirmingRemoval.value = false;
        open.value = false;
        emit('changed');
    } catch (error) {
        toast.failure(error);
    } finally {
        isRemoving.value = false;
    }
};
</script>
<template>
    <section class="section-portal-meals-meal-sheet">
        <drawer-component v-model:open="open" :title="meal?.name ?? ''" :description="description">
            <div v-if="meal" class="sheet">
                <img v-if="meal.photoUrl" class="photo" :src="meal.photoUrl" :alt="`Foto van ${meal.name}`" />
                <button-component
                    v-if="meal.recipeIdentifier && !meal.leftoverOf"
                    icon="fa-solid fa-fire-burner"
                    @click="emit('cook', meal)"
                >
                    {{
                        meal.steps.length > 0
                            ? `Koken · ${meal.steps.length} ${meal.steps.length === 1 ? 'stap' : 'stappen'}`
                            : 'Koken'
                    }}
                </button-component>

                <div class="field">
                    <section-label-component>Wie eet dit</section-label-component>
                    <div class="people">
                        <button
                            v-for="member in members"
                            :key="member.identifier"
                            type="button"
                            :class="{ 'is-active': eats(member) }"
                            :aria-pressed="eats(member)"
                            @click="toggleEater(member)"
                        >
                            {{ member.displayName }}
                        </button>
                    </div>
                </div>

                <div class="guests">
                    <div class="what">
                        <span class="title">Gasten erbij</span>
                        <span class="meta">
                            {{ meal.eaterCount }} {{ meal.eaterCount === 1 ? 'eter' : 'eters' }} in totaal
                        </span>
                    </div>
                    <stepper-component
                        :model-value="meal.guests"
                        :min="0"
                        :max="20"
                        label="Gasten"
                        @update:model-value="update({ guests: $event })"
                    ></stepper-component>
                </div>

                <p v-if="meal.eaterCount === 0" class="hint">
                    Kies hierboven wie dit eet, dan schaalt Bably de ingrediënten en zet ze op de lijst.
                </p>

                <p v-if="meal.leftoverOf" class="leftover-note">
                    Gekookt op {{ weekdayOf(meal.leftoverOf.eatenOn) }}: wie hier meeeet, telt mee in wat je die dag
                    kookt.
                </p>

                <div v-if="!meal.leftoverOf" class="field">
                    <section-label-component>Ook nog eten op</section-label-component>
                    <div class="later-days">
                        <span v-for="leftover in meal.leftovers" :key="leftover.identifier" class="planned">
                            {{ weekdayOf(leftover.eatenOn) }} · {{ leftover.eaterCount }}
                            {{ leftover.eaterCount === 1 ? 'eter' : 'eters' }}
                        </span>
                        <button
                            v-for="later in laterDays"
                            :key="later.date"
                            type="button"
                            @click="eatAgainOn(later.date)"
                        >
                            + {{ later.label }}
                        </button>
                    </div>
                </div>

                <div v-if="toBuy.length > 0" class="field">
                    <section-label-component>
                        {{
                            meal.leftovers.length > 0
                                ? `Ingrediënten voor ${meal.portions} porties · op je lijst`
                                : 'Ingrediënten · op je lijst'
                        }}
                    </section-label-component>
                    <ul class="ingredients">
                        <li v-for="ingredient in toBuy" :key="ingredient.name">
                            <span>{{ ingredient.name }}</span>
                            <span class="amount">{{ ingredient.amount }}</span>
                        </li>
                    </ul>
                </div>

                <div v-if="fromStaples.length > 0" class="field">
                    <section-label-component> Uit je voorraad </section-label-component>
                    <ul class="ingredients">
                        <li v-for="ingredient in fromStaples" :key="ingredient.name">
                            <span>{{ ingredient.name }}</span>
                            <span class="amount">{{ ingredient.amount }}</span>
                            <button type="button" class="to-list" @click="putOnList(ingredient)">
                                toch op de lijst
                            </button>
                        </li>
                    </ul>
                </div>

                <div class="actions">
                    <button type="button" class="action" @click="moveToTomorrow()">
                        <span class="title">Verplaats naar morgen</span>
                        <span class="meta">De lijst schuift mee</span>
                    </button>
                    <button type="button" class="action" @click="chooseDay()">
                        <span class="title">Andere dag kiezen</span>
                        <span class="meta">De lijst schuift mee</span>
                    </button>
                    <input
                        ref="dayInput"
                        class="sr-only"
                        type="date"
                        tabindex="-1"
                        aria-hidden="true"
                        :value="meal.eatenOn"
                        @change="moveTo(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="meal.recipeIdentifier"
                        type="button"
                        class="action"
                        @click="emit('editRecipe', meal.recipeIdentifier)"
                    >
                        <span class="title">Recept aanpassen</span>
                        <span class="meta">Naam, porties en ingrediënten</span>
                    </button>
                    <button-component variant="danger" @click="isConfirmingRemoval = true">
                        Van het menu halen
                    </button-component>
                </div>

                <button-component variant="ghost" @click="open = false"> Sluiten </button-component>
            </div>
        </drawer-component>

        <confirm-dialog-component
            v-if="meal"
            v-model:open="isConfirmingRemoval"
            title="Van het menu halen?"
            :description="`${meal.name} verdwijnt van ${day}. Wat nog niet in de kar ligt, gaat van de lijst.`"
            confirm-label="Van het menu"
            :processing="isRemoving"
            @confirm="remove()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/meal-sheet.css';
</style>
