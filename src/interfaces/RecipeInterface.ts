import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';

export interface RecipeInterface {
    identifier: string;
    name: string;
    baseServings: number;
    sourceUrl: string | null;
    photoUrl: string | null;
    steps: string[];
    ingredients: IngredientLineInterface[];
}

/**
 * What the recipe form edits: an existing recipe, or an imported or empty one not saved yet.
 */
export interface RecipeDraftInterface {
    identifier: string | null;
    name: string;
    baseServings: number;
    sourceUrl: string | null;
    photoUrl: string | null;
    steps: string[];
    ingredients: IngredientLineInterface[];
}
