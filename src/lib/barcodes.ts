import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';

/**
 * Mirrors Barcode::normalise on the server: a 12-digit UPC-A is the same code as the
 * EAN-13 with a leading 0.
 */
export function normaliseBarcode(ean: string): string {
    const digits = ean.replace(/\D/g, '');

    return digits.length === 12 ? `0${digits}` : digits;
}

const carries = (item: GroceryItemInterface, ean: string): boolean =>
    // A list cached before barcodes existed has rows without them.
    (item.barcodes ?? []).some((barcode) => normaliseBarcode(barcode) === ean);

/**
 * The row a scanned barcode belongs to, found on the phone so ticking by scan works
 * without signal. An open row wins over one already in the basket.
 */
export function findRowForBarcode(groups: GroceryGroupInterface[], scanned: string): GroceryItemInterface | null {
    const ean = normaliseBarcode(scanned);
    const rows = groups.flatMap((group) => group.items).filter((item) => carries(item, ean));

    return rows.find((item) => !item.checked) ?? rows[0] ?? null;
}

export function findRowForProduct(groups: GroceryGroupInterface[], productIdentifier: string): GroceryItemInterface | null {
    const rows = groups.flatMap((group) => group.items).filter((item) => item.productIdentifier === productIdentifier);

    return rows.find((item) => !item.checked) ?? rows[0] ?? null;
}
