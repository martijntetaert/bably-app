import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';

export interface CookingInterface {
    name: string;
    servings: number;
    photoUrl: string | null;
    ingredients: IngredientLineInterface[];
    steps: string[];
}
