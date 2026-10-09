import { MealInterface } from '@/interfaces/MealInterface';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';

export interface DashboardInterface {
    members: UserInterface[];
    tasksToday: TaskInterface[];
    openTaskCount: number;
    listCount: number;
    lowStockCount: number;
    activeTrip: ShoppingTripInterface | null;
    tonight: MealInterface[];
    start: { invite: boolean; store: boolean; meal: boolean } | null;
}
