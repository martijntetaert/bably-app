import { AddedGroceriesInterface, FinishedTripInterface } from '@/interfaces/ShoppingListInterface';

const products = (count: number): string => `${count} ${count === 1 ? 'product' : 'producten'}`;

/**
 * Mirrors the portal's StoreGroceryItemController: one product added needs no toast, it
 * appears on the list in front of you.
 */
export function addedSummary(result: AddedGroceriesInterface): string | null {
    const parts: string[] = [];

    if (result.added.length > 1) {
        parts.push(`${result.added.length} producten op de lijst gezet.`);
    }

    if (result.alreadyOpen.length > 0) {
        parts.push(`${result.alreadyOpen.join(' en ')} ${result.alreadyOpen.length === 1 ? 'staat' : 'staan'} al op de lijst.`);
    }

    return parts.length === 0 ? null : parts.join(' ');
}

export function finishedSummary(result: FinishedTripInterface): string {
    if (result.bought === 0) {
        return 'Winkelen afgerond. Je lijst bleef ongewijzigd.';
    }

    const bought = `Winkelen afgerond: ${products(result.bought)} van de lijst gehaald.`;

    if (result.newlyPlaced === 0) {
        return bought;
    }

    const placed = result.newlyPlaced === 1 ? '1 nieuw product' : `${result.newlyPlaced} nieuwe producten`;

    return `${bought} Bably kent nu ook de plaats van ${placed} in ${result.store}.`;
}
