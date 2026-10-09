<script setup lang="ts">
import { computed, ref } from 'vue';
import { DateTime } from 'luxon';
import { IonButton, IonButtons, IonContent, IonDatetime, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue';
import { calendarOutline, chevronForward, flame } from '@/lib/icons';
import { meals, shopping, type MealFields } from '@/api/bably';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { MealInterface } from '@/interfaces/MealInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import StepperComponent from '@/views/meals/components/stepper-component.vue';

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
const confirm = useConfirm();

const day = computed(() => (props.meal ? DateTime.fromISO(props.meal.eatenOn).setLocale('nl-BE').toFormat('cccc d MMMM') : ''));

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
    const cookedOn = DateTime.fromISO(props.meal.eatenOn);

    return [1, 2, 3]
        .map((offset) => cookedOn.plus({ days: offset }))
        .filter((date) => !planned.includes(date.toISODate() ?? ''))
        .map((date) => ({ date: date.toISODate() ?? '', label: date.setLocale('nl-BE').toFormat('ccc d') }));
});

const toBuy = computed(() => props.meal?.ingredients.filter((ingredient) => !ingredient.staple) ?? []);

const fromStaples = computed(() => props.meal?.ingredients.filter((ingredient) => ingredient.staple) ?? []);

const eats = (member: UserInterface): boolean => props.meal?.eaters.some((eater) => eater.identifier === member.identifier) ?? false;

const run = async (action: () => Promise<unknown>): Promise<void> => {
    try {
        await action();
    } catch (error) {
        await toast.failure(error);
    } finally {
        emit('changed');
    }
};

const update = (fields: MealFields): Promise<void> => {
    const meal = props.meal;

    return meal ? run(() => meals.update(meal.identifier, fields)) : Promise.resolve();
};

const eatAgainOn = (date: string): Promise<void> => {
    const meal = props.meal;

    return meal ? run(() => meals.planLeftover(meal.identifier, { eatenOn: date })) : Promise.resolve();
};

// Takes the product out of the staples, so this and every other dish puts it on the list again.
const putOnList = (ingredient: IngredientLineInterface): Promise<void> => {
    const product = ingredient.productIdentifier;

    return product ? run(() => shopping.setStaple(product, false)) : Promise.resolve();
};

const toggleEater = (member: UserInterface): Promise<void> => {
    const eaters = props.meal?.eaters.map((eater) => eater.identifier) ?? [];

    return update({
        eaterIdentifiers: eats(member) ? eaters.filter((identifier) => identifier !== member.identifier) : [...eaters, member.identifier],
    });
};

const moveToTomorrow = (): Promise<void> => {
    if (!props.meal) {
        return Promise.resolve();
    }

    return update({ eatenOn: DateTime.fromISO(props.meal.eatenOn).plus({ days: 1 }).toISODate() ?? undefined });
};

const isChoosingDay = ref(false);

const moveTo = async (value: string | string[] | null | undefined): Promise<void> => {
    const date = typeof value === 'string' ? value.slice(0, 10) : null;
    isChoosingDay.value = false;

    if (date !== null && date !== props.meal?.eatenOn) {
        await update({ eatenOn: date });
    }
};

const remove = async (): Promise<void> => {
    const meal = props.meal;

    if (!meal) {
        return;
    }

    const isSure = await confirm(
        'Van het menu halen?',
        `${meal.name} verdwijnt van ${day.value}. Wat nog niet in de kar ligt, gaat van de lijst.`,
        'Van het menu',
    );

    if (!isSure) {
        return;
    }

    try {
        await meals.remove(meal.identifier);
        open.value = false;
        emit('changed');
    } catch (error) {
        await toast.failure(error);
    }
};
</script>
<template>
    <ion-modal :is-open="open" :initial-breakpoint="0.9" :breakpoints="[0, 0.9, 1]" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-title>{{ meal?.name }}</ion-title>
                <ion-buttons slot="end">
                    <ion-button @click="open = false">Sluiten</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <div v-if="meal" class="sheet">
                <p class="description">{{ description }}</p>
                <img v-if="meal.photoUrl" class="photo" :src="meal.photoUrl" :alt="`Foto van ${meal.name}`" />
                <ion-button v-if="meal.recipeIdentifier && !meal.leftoverOf" expand="block" @click="emit('cook', meal)">
                    <i slot="start" :class="flame" aria-hidden="true"></i>
                    {{ meal.steps.length > 0 ? `Koken · ${meal.steps.length} ${meal.steps.length === 1 ? 'stap' : 'stappen'}` : 'Koken' }}
                </ion-button>

                <div class="field">
                    <h3 class="label">Wie eet dit</h3>
                    <div class="chips">
                        <button
                            v-for="member in members"
                            :key="member.identifier"
                            type="button"
                            class="chip"
                            :class="{ 'is-active': eats(member) }"
                            :aria-pressed="eats(member)"
                            @click="toggleEater(member)"
                        >
                            {{ member.displayName }}
                        </button>
                    </div>
                </div>

                <div class="row">
                    <div class="what">
                        <span class="title">Gasten erbij</span>
                        <span class="meta">{{ meal.eaterCount }} {{ meal.eaterCount === 1 ? 'eter' : 'eters' }} in totaal</span>
                    </div>
                    <stepper-component :model-value="meal.guests" :min="0" :max="20" label="Gasten" @update:model-value="update({ guests: $event })" />
                </div>

                <p v-if="meal.eaterCount === 0" class="hint">Kies hierboven wie dit eet, dan schaalt Bably de ingrediënten en zet ze op de lijst.</p>

                <p v-if="meal.leftoverOf" class="note">
                    Gekookt op {{ weekdayOf(meal.leftoverOf.eatenOn) }}: wie hier meeeet, telt mee in wat je die dag kookt.
                </p>

                <div v-if="!meal.leftoverOf" class="field">
                    <h3 class="label">Ook nog eten op</h3>
                    <div class="chips">
                        <span v-for="leftover in meal.leftovers" :key="leftover.identifier" class="chip is-planned">
                            {{ weekdayOf(leftover.eatenOn) }} · {{ leftover.eaterCount }} {{ leftover.eaterCount === 1 ? 'eter' : 'eters' }}
                        </span>
                        <button v-for="later in laterDays" :key="later.date" type="button" class="chip" @click="eatAgainOn(later.date)">
                            + {{ later.label }}
                        </button>
                    </div>
                </div>

                <div v-if="toBuy.length > 0" class="field">
                    <h3 class="label">
                        {{ meal.leftovers.length > 0 ? `Ingrediënten voor ${meal.portions} porties · op je lijst` : 'Ingrediënten · op je lijst' }}
                    </h3>
                    <ul class="ingredients">
                        <li v-for="ingredient in toBuy" :key="ingredient.name">
                            <span>{{ ingredient.name }}</span>
                            <span class="amount">{{ ingredient.amount }}</span>
                        </li>
                    </ul>
                </div>

                <div v-if="fromStaples.length > 0" class="field">
                    <h3 class="label">Uit je voorraad</h3>
                    <ul class="ingredients">
                        <li v-for="ingredient in fromStaples" :key="ingredient.name">
                            <span>{{ ingredient.name }}</span>
                            <span class="amount">{{ ingredient.amount }}</span>
                            <button type="button" class="to-list" @click="putOnList(ingredient)">toch op de lijst</button>
                        </li>
                    </ul>
                </div>

                <div class="actions">
                    <button type="button" class="action" @click="moveToTomorrow()">
                        <span class="what">
                            <span class="title">Verplaats naar morgen</span>
                            <span class="meta">De lijst schuift mee</span>
                        </span>
                        <i :class="chevronForward" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="action" @click="isChoosingDay = true">
                        <span class="what">
                            <span class="title">Andere dag kiezen</span>
                            <span class="meta">De lijst schuift mee</span>
                        </span>
                        <i :class="calendarOutline" aria-hidden="true"></i>
                    </button>
                    <button v-if="meal.recipeIdentifier" type="button" class="action" @click="emit('editRecipe', meal.recipeIdentifier)">
                        <span class="what">
                            <span class="title">Recept aanpassen</span>
                            <span class="meta">Naam, porties en ingrediënten</span>
                        </span>
                        <i :class="chevronForward" aria-hidden="true"></i>
                    </button>
                </div>

                <ion-button expand="block" fill="outline" color="danger" @click="remove()">Van het menu halen</ion-button>
            </div>
        </ion-content>
        <ion-modal :is-open="isChoosingDay" class="day-picker" @did-dismiss="isChoosingDay = false">
            <ion-datetime
                v-if="meal"
                presentation="date"
                locale="nl-BE"
                :first-day-of-week="1"
                :value="meal.eatenOn"
                @ion-change="moveTo($event.detail.value)"
            />
        </ion-modal>
    </ion-modal>
</template>
<style scoped>
.day-picker {
    --width: fit-content;
    --height: fit-content;
    --border-radius: var(--bably-radius-card);
}

.sheet {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
}

.description {
    margin: 0;
    color: var(--bably-muted-text);
}

.description::first-letter {
    text-transform: uppercase;
}

.photo {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    border-radius: var(--bably-radius-card);
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.label {
    margin: 0;
    font-family: var(--ion-font-family);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--bably-muted-text);
}

.chips {
    display: flex;
    flex-wrap: wrap;
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

.chip {
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
    font-size: 0.9rem;
}

.chip.is-active {
    border-color: var(--ion-color-primary);
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
    font-weight: 600;
}

.chip.is-planned {
    background: var(--bably-muted);
    border-color: transparent;
}

.row,
.action {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
    border: 1px solid var(--bably-border);
}

.action {
    width: 100%;
}

.action i {
    color: var(--bably-muted-text);
}

.what {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.title {
    font-weight: 600;
}

.meta {
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}

.hint,
.note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--bably-muted-text);
}

.note {
    padding: 0.75rem 1rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-muted);
}

.ingredients {
    list-style: none;
    margin: 0;
    padding: 0;
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
    border: 1px solid var(--bably-border);
}

.ingredients li {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
}

.ingredients li + li {
    border-top: 1px solid var(--bably-border);
}

.ingredients li > span:first-child {
    flex: 1;
}

.amount {
    color: var(--bably-muted-text);
    font-size: 0.9rem;
}

.to-list {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ion-color-primary);
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
