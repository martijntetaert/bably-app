export type RecurrenceValue = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RecurrenceInterface {
    value: RecurrenceValue;
    label: string;
    interval?: number;
    days?: number[];
}
