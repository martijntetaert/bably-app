import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { UserInterface } from '@/interfaces/UserInterface';

export interface MealInterface {
    identifier: string;
    name: string;
    eatenOn: string;
    recipeIdentifier: string | null;
    baseServings: number | null;
    photoUrl: string | null;
    steps: string[];
    guests: number;
    eaterCount: number;
    portions: number;
    eaters: UserInterface[];
    leftoverOf: { identifier: string; eatenOn: string } | null;
    leftovers: { identifier: string; eatenOn: string; eaterCount: number }[];
    ingredients: IngredientLineInterface[];
}

export interface MealDayInterface {
    date: string;
    meals: MealInterface[];
}
