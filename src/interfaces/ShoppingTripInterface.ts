import { StoreInterface } from '@/interfaces/StoreInterface';
import { UserInterface } from '@/interfaces/UserInterface';

export interface ShoppingTripInterface {
    identifier: string;
    startedAt: string;
    store: StoreInterface;
    startedBy?: UserInterface | null;
}
