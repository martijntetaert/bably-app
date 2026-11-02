<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { onIonViewWillEnter, onIonViewWillLeave } from '@ionic/vue';
import { household, meals, recipes as recipesApi } from '@/api/bably';
import { usePlus } from '@/composables/usePlus';
import { useToast } from '@/composables/useToast';
import PortalPageComponent from '@/components/portal-page-component.vue';
import SegmentedControlComponent from '@/components/segmented-control-component.vue';
import { CookingInterface } from '@/interfaces/CookingInterface';
import { MealInterface } from '@/interfaces/MealInterface';
import { RecipeDraftInterface, RecipeInterface } from '@/interfaces/RecipeInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { WeekMenuInterface } from '@/interfaces/WeekMenuInterface';
import MealsHeader from '@/views/meals/sections/meals-header.vue';
import WeekMenu from '@/views/meals/sections/week-menu.vue';
import Recipes from '@/views/meals/sections/recipes.vue';
import RecipeBar from '@/views/meals/sections/recipe-bar.vue';
import MealSheet from '@/views/meals/sections/meal-sheet.vue';
import MealPicker from '@/views/meals/sections/meal-picker.vue';
import RecipeEditor from '@/views/meals/sections/recipe-editor.vue';
import CookMode from '@/views/meals/sections/cook-mode.vue';

type Tab = 'menu' | 'recipes';

const toast = useToast();
const { hasPlus, showPaywall } = usePlus();

const tabs: { value: Tab; label: string }[] = [
    { value: 'menu', label: 'Weekmenu' },
    { value: 'recipes', label: 'Recepten' },
];

const activeTab = ref<Tab>('menu');
const week = ref<WeekMenuInterface | null>(null);
const recipeList = ref<RecipeInterface[]>([]);
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
    () =>
        week.value?.days.flatMap((day) => day.meals).find((meal) => meal.identifier === openMealIdentifier.value) ??
        null
);

watch(openMeal, (meal) => {
    if (meal === null) {
        isMealOpen.value = false;
    }
});

const subtitle = computed(() => {
    if (activeTab.value === 'recipes') {
        return `${recipeList.value.length} ${recipeList.value.length === 1 ? 'recept' : 'recepten'}`;
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
    recipeList.value = await recipesApi.list();
};

const reload = async (): Promise<void> => {
    try {
        const [, , people] = await Promise.all([loadWeek(week.value?.weekStart), loadRecipes(), household.members()]);
        members.value = people;
    } catch (error) {
        toast.failure(error);
    } finally {
        hasLoaded.value = true;
    }
};

const showWeek = async (weekStart: string | undefined): Promise<void> => {
    try {
        await loadWeek(weekStart);
    } catch (error) {
        toast.failure(error);
    }
};

const reloadWeek = (): Promise<void> => showWeek(week.value?.weekStart);

const reloadAfterRecipeChange = async (): Promise<void> => {
    try {
        await Promise.all([loadRecipes(), loadWeek(week.value?.weekStart)]);
    } catch (error) {
        toast.failure(error);
    }
};

const closeAll = (): void => {
    isMealOpen.value = false;
    isPickerOpen.value = false;
    isEditorOpen.value = false;
    isCooking.value = false;
};

onIonViewWillEnter(() => {
    void reload();
});

onIonViewWillLeave(closeAll);


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
    const recipe = recipeList.value.find((candidate) => candidate.identifier === identifier);

    if (recipe) {
        editRecipe({ ...recipe });
    }
};

// Cook mode is Plus; it runs on the phone alone, so the app is what keeps it closed.
const cook = (dish: CookingInterface): void => {
    if (!hasPlus.value) {
        showPaywall();

        return;
    }

    cooking.value = dish;
    isMealOpen.value = false;
    isEditorOpen.value = false;
    isCooking.value = true;
};

const cookMeal = (meal: MealInterface): void => {
    cook({
        name: meal.name,
        servings: meal.portions,
        photoUrl: meal.photoUrl,
        ingredients: meal.ingredients,
        steps: meal.steps,
    });
};

const cookRecipe = (identifier: string): void => {
    const recipe = recipeList.value.find((candidate) => candidate.identifier === identifier);

    if (recipe) {
        cook({
            name: recipe.name,
            servings: recipe.baseServings,
            photoUrl: recipe.photoUrl,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
        });
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
</script>
<template>
    <portal-page-component :refresh="reload">
        <div id="page-portal-meals-overview">
            <meals-header
                :subtitle="subtitle"
                :week-start="week?.weekStart ?? ''"
                :today="week?.today ?? ''"
                :shows-week="activeTab === 'menu' && week !== null"
                @show-week="showWeek"
            ></meals-header>
            <segmented-control-component v-model="activeTab" :options="tabs" label="Eten" />
            <template v-if="activeTab === 'menu'">
                <week-menu
                    v-if="week"
                    :days="week.days"
                    :today="week.today"
                    @show="showMeal"
                    @plan="planOn"
                    @changed="reloadWeek()"
                ></week-menu>
                <div v-else-if="!hasLoaded" class="skeleton" aria-hidden="true">
                    <div v-for="day in 7" :key="day" class="skeleton-day"></div>
                </div>
            </template>
            <template v-else>
                <recipes v-if="hasLoaded" :recipes="recipeList" @edit="(recipe) => editRecipe({ ...recipe })"></recipes>
                <recipe-bar @imported="editRecipe" @new-recipe="newRecipe"></recipe-bar>
            </template>

            <meal-sheet
                v-model:open="isMealOpen"
                :meal="openMeal"
                :members="members"
                @edit-recipe="editRecipeByIdentifier"
                @cook="cookMeal"
                @changed="reloadWeek()"
            ></meal-sheet>
            <meal-picker
                v-model:open="isPickerOpen"
                :date="pickerDate"
                :recipes="recipeList"
                @planned="reloadAfterRecipeChange()"
                @new-recipe="newRecipe"
            ></meal-picker>
            <recipe-editor
                v-model:open="isEditorOpen"
                :draft="recipeDraft"
                @saved="reloadAfterRecipeChange()"
                @cook="cookRecipe"
            ></recipe-editor>
            <cook-mode v-model:open="isCooking" :cooking="cooking"></cook-mode>
        </div>
    </portal-page-component>
</template>
<style scoped>
@import '@css/pages/portal/meals/overview.css';


.skeleton {
    @apply flex flex-col gap-2.5;
}

.skeleton-day {
    @apply rounded-row bg-muted h-17 animate-pulse;
}
</style>
