import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';

export interface GroceryGroupInterface {
    key: 'list' | 'route' | 'unplaced' | 'missing';
    name: string;
    items: GroceryItemInterface[];
}
