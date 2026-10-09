import { TaskInterface } from '@/interfaces/TaskInterface';

export interface TaskListInterface {
    data: TaskInterface[];
    openTaskCount: number;
}
