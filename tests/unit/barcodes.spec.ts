import { describe, expect, it } from 'vitest';
import { GroceryGroupInterface } from '@/interfaces/GroceryGroupInterface';
import { GroceryItemInterface } from '@/interfaces/GroceryItemInterface';
import { findRowForBarcode } from '@/lib/barcodes';

const row = (name: string, barcodes: string[], checked = false): GroceryItemInterface => ({
    identifier: name,
    identifiers: [name],
    name,
    productIdentifier: `product-${name}`,
    barcodes,
    quantity: null,
    note: null,
    reason: null,
    checked,
    missing: false,
    addedBy: null,
});

const list = (...items: GroceryItemInterface[]): GroceryGroupInterface[] => [{ key: 'list', name: 'Lijst', items }];

describe('findRowForBarcode', () => {
    it('finds the row that carries the scanned barcode', () => {
        const groups = list(row('melk', ['5410000000001']), row('brood', ['5400000000002']));

        expect(findRowForBarcode(groups, '5400000000002')?.name).toBe('brood');
    });

    it('treats a 12-digit UPC-A as the EAN-13 with a leading zero', () => {
        expect(findRowForBarcode(list(row('cola', ['0049000000443'])), '049000000443')?.name).toBe('cola');
        expect(findRowForBarcode(list(row('cola', ['049000000443'])), '0049000000443')?.name).toBe('cola');
    });

    it('prefers an open row over one already in the basket', () => {
        const groups = list(row('melk', ['5410000000001'], true), row('halfvolle melk', ['5410000000001']));

        expect(findRowForBarcode(groups, '5410000000001')?.name).toBe('halfvolle melk');
    });

    it('finds nothing for an unknown barcode or a row cached without barcodes', () => {
        const cached = { ...row('kaas', []), barcodes: undefined } as unknown as GroceryItemInterface;

        expect(findRowForBarcode(list(row('melk', ['5410000000001']), cached), '5400000000002')).toBeNull();
    });
});
