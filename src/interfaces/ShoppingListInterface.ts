import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';

export interface ShoppingListInterface {
    groups: GroceryGroupInterface[];
    activeTrip: ShoppingTripInterface | null;
    followsAlongLive: boolean;
}

export interface AddedGroceriesInterface {
    added: string[];
    alreadyOpen: string[];
}

export interface FinishedTripInterface {
    bought: number;
    newlyPlaced: number;
    store: string;
}
