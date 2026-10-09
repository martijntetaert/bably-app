<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    onIonViewWillEnter,
    type RefresherCustomEvent,
} from '@ionic/vue';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { household, meals, recipes as recipesApi } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { CookingInterface } from '@/interfaces/CookingInterface';
import { MealInterface } from '@/interfaces/MealInterface';
import { RecipeDraftInterface, RecipeInterface } from '@/interfaces/RecipeInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { WeekMenuInterface } from '@/interfaces/WeekMenuInterface';
import CookModeComponent from '@/views/meals/components/cook-mode-component.vue';
import MealPickerComponent from '@/views/meals/components/meal-picker-component.vue';
import MealSheetComponent from '@/views/meals/components/meal-sheet-component.vue';
import RecipeEditorComponent from '@/views/meals/components/recipe-editor-component.vue';
import RecipeImportComponent from '@/views/meals/components/recipe-import-component.vue';
import RecipeListComponent from '@/views/meals/components/recipe-list-component.vue';
import WeekMenuComponent from '@/views/meals/components/week-menu-component.vue';

type Tab = 'menu' | 'recipes';

const toast = useToast();

const activeTab = ref<Tab>('menu');
const week = ref<WeekMenuInterface | null>(null);
const recipes = ref<RecipeInterface[]>([]);
const members = ref<UserInterface[]>([]);
const hasLoaded = ref(false);

const openMealIdentifier = ref<string | null>(null);
const isMealOpen = ref(false);
const pickerDate = ref<string | null>(null);
const isPickerOpen = ref(false);
const recipeDraft = ref<RecipeDraftInterface | null>(null);
const isEditorOpen = ref(false);
const cooking = ref<CookingInterface | null>(null);
const isCooking = ref(false);

// The sheet follows the week, so a change made in it shows right away after the reload.
const openMeal = computed(
    () => week.value?.days.flatMap((day) => day.meals).find((meal) => meal.identifier === openMealIdentifier.value) ?? null,
);

watch(openMeal, (meal) => {
    if (meal === null) {
        isMealOpen.value = false;
    }
});

const isThisWeek = computed(() => week.value !== null && DateTime.fromISO(week.value.today).startOf('week').toISODate() === week.value.weekStart);

const subtitle = computed(() => {
    if (activeTab.value === 'recipes') {
        return `${recipes.value.length} ${recipes.value.length === 1 ? 'recept' : 'recepten'}`;
    }

    if (week.value === null) {
        return '';
    }

    const start = DateTime.fromISO(week.value.weekStart).setLocale('nl-BE');

    return `Week ${start.weekNumber} · ${start.toFormat('d MMM')} – ${start.plus({ days: 6 }).toFormat('d MMM')}`;
});

const loadWeek = async (weekStart?: string): Promise<void> => {
    week.value = await meals.week(weekStart);
};

const loadRecipes = async (): Promise<void> => {
    recipes.value = await recipesApi.list();
};

const loadAll = async (): Promise<void> => {
    try {
        const [, , people] = await Promise.all([loadWeek(week.value?.weekStart), loadRecipes(), household.members()]);
        members.value = people;
    } catch (error) {
        await toast.failure(error);
    } finally {
        hasLoaded.value = true;
    }
};

onIonViewWillEnter(() => {
    void loadAll();
});

const refresh = async (event: RefresherCustomEvent): Promise<void> => {
    await loadAll();
    await event.target.complete();
};

const showWeek = async (offset: number | null): Promise<void> => {
    const target =
        offset === null || week.value === null ? undefined : (DateTime.fromISO(week.value.weekStart).plus({ weeks: offset }).toISODate() ?? undefined);

    try {
        await loadWeek(target);
    } catch (error) {
        await toast.failure(error);
    }
};

const reloadWeek = async (): Promise<void> => {
    try {
        await loadWeek(week.value?.weekStart);
    } catch (error) {
        await toast.failure(error);
    }
};

const reloadAfterRecipeChange = async (): Promise<void> => {
    try {
        await Promise.all([loadRecipes(), loadWeek(week.value?.weekStart)]);
    } catch (error) {
        await toast.failure(error);
    }
};

const showMeal = (meal: MealInterface): void => {
    openMealIdentifier.value = meal.identifier;
    isMealOpen.value = true;
};

const planOn = (date: string): void => {
    pickerDate.value = date;
    isPickerOpen.value = true;
};

const editRecipe = (draft: RecipeDraftInterface): void => {
    recipeDraft.value = draft;
    isMealOpen.value = false;
    isPickerOpen.value = false;
    isEditorOpen.value = true;
};

const editRecipeByIdentifier = (identifier: string): void => {
    const recipe = recipes.value.find((candidate) => candidate.identifier === identifier);

    if (recipe) {
        editRecipe({ ...recipe });
    }
};

const newRecipe = (): void => {
    editRecipe({
        identifier: null,
        name: '',
        baseServings: Math.max(1, members.value.length),
        sourceUrl: null,
        photoUrl: null,
        steps: [],
        ingredients: [],
    });
};

const cook = (dish: CookingInterface): void => {
    cooking.value = dish;
    isMealOpen.value = false;
    isEditorOpen.value = false;
    isCooking.value = true;
};

const cookMeal = (meal: MealInterface): void => {
    cook({ name: meal.name, servings: meal.portions, photoUrl: meal.photoUrl, ingredients: meal.ingredients, steps: meal.steps });
};

const cookRecipe = (identifier: string): void => {
    const recipe = recipes.value.find((candidate) => candidate.identifier === identifier);

    if (recipe) {
        cook({ name: recipe.name, servings: recipe.baseServings, photoUrl: recipe.photoUrl, ingredients: recipe.ingredients, steps: recipe.steps });
    }
};
</script>
<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Eten</ion-title>
                <ion-buttons v-if="activeTab === 'menu'" slot="end">
                    <ion-button aria-label="Vorige week" @click="showWeek(-1)">
                        <ion-icon slot="icon-only" :icon="chevronBack" aria-hidden="true" />
                    </ion-button>
                    <ion-button v-if="!isThisWeek" @click="showWeek(null)">Deze week</ion-button>
                    <ion-button aria-label="Volgende week" @click="showWeek(1)">
                        <ion-icon slot="icon-only" :icon="chevronForward" aria-hidden="true" />
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
            <ion-toolbar>
                <ion-segment v-model="activeTab" aria-label="Eten">
                    <ion-segment-button value="menu">
                        <ion-label>Weekmenu</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="recipes">
                        <ion-label>Recepten</ion-label>
                    </ion-segment-button>
                </ion-segment>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <ion-refresher slot="fixed" @ion-refresh="refresh($event)">
                <ion-refresher-content />
            </ion-refresher>

            <p class="subtitle">{{ subtitle }}</p>

            <template v-if="activeTab === 'menu'">
                <week-menu-component v-if="week" :days="week.days" :today="week.today" @show="showMeal" @plan="planOn" @changed="reloadWeek()" />
                <div v-else-if="!hasLoaded" class="skeleton" aria-hidden="true">
                    <ion-skeleton-text v-for="day in 7" :key="day" :animated="true" class="skeleton-day" />
                </div>
            </template>
            <div v-else class="recipes">
                <recipe-import-component @imported="editRecipe" @new-recipe="newRecipe" />
                <recipe-list-component v-if="hasLoaded" :recipes="recipes" @edit="(recipe) => editRecipe({ ...recipe })" />
            </div>

        </ion-content>

        <meal-sheet-component
            v-model:open="isMealOpen"
            :meal="openMeal"
            :members="members"
            @edit-recipe="editRecipeByIdentifier"
            @cook="cookMeal"
            @changed="reloadWeek()"
        />
        <meal-picker-component v-model:open="isPickerOpen" :date="pickerDate" :recipes="recipes" @planned="reloadAfterRecipeChange()" @new-recipe="newRecipe" />
        <recipe-editor-component v-model:open="isEditorOpen" :draft="recipeDraft" @saved="reloadAfterRecipeChange()" @cook="cookRecipe" />
        <cook-mode-component v-model:open="isCooking" :cooking="cooking" />
    </ion-page>
</template>
<style scoped>
.subtitle {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: var(--bably-muted-text);
}

.skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.skeleton-day {
    height: 4.25rem;
    margin: 0;
    border-radius: var(--bably-radius-card);
}

.recipes {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>
