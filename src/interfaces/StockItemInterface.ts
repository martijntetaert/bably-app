export type StockLevel = 'in' | 'low' | 'out';

export interface StockItemInterface {
    identifier: string;
    name: string;
    level: StockLevel;
    probablyLowEveryDays: number | null;
}
