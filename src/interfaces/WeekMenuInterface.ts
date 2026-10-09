import { MealDayInterface } from '@/interfaces/MealInterface';

export interface WeekMenuInterface {
    weekStart: string;
    today: string;
    days: MealDayInterface[];
}
