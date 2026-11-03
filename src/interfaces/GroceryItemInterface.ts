export interface GroceryItemInterface {
    identifier: string;
    identifiers: string[];
    name: string;
    productIdentifier: string;
    barcodes: string[];
    quantity: string | null;
    note: string | null;
    reason: string | null;
    checked: boolean;
    missing: boolean;
    addedBy: {
        identifier: string;
        firstname: string;
        addedAt: string;
    } | null;
}
