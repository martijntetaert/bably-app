import { StockLevel } from '@/interfaces/StockItemInterface';

/**
 * Barcodes and purchase history only come with the product overview; a rename, merge or
 * barcode lookup leaves them out.
 */
export interface ProductInterface {
    identifier: string;
    name: string;
    microCategory?: string | null;
    microCategorySetByUser?: boolean;
    isStaple?: boolean;
    stockLevel?: StockLevel;
    snoozedUntil?: string | null;
    barcodes?: string[];
    purchasesCount?: number;
    lastBoughtAt?: string | null;
}
