import { ProductInterface } from '@/interfaces/ProductInterface';

export interface BarcodeInterface {
    ean: string;
    name: string | null;
    brand: string | null;
    microCategory: string | null;
    product: ProductInterface | null;
}
