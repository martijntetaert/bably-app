import { RecurrenceInterface } from '@/interfaces/RecurrenceInterface';
import { UserInterface } from '@/interfaces/UserInterface';

export interface TaskInterface {
    identifier: string;
    title: string;
    finished: boolean;
    dueOn: string;
    overdue: boolean;
    recurrence: RecurrenceInterface;
    user: UserInterface;
    completedAt: string | null;
    completedBy: UserInterface | null;
    can: {
        update: boolean;
        delete: boolean;
    };
}
