import { Capacitor } from '@capacitor/core';
import { PACKAGE_TYPE, PURCHASES_ERROR_CODE, Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';

const apiKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;

/**
 * Plus is only sold through Google Play for now; the iPhone app is still a local test build.
 */
export const sellsPlus = Capacitor.getPlatform() === 'android' && apiKey !== undefined && apiKey !== '';

export const manageSubscriptionUrl = 'https://play.google.com/store/account/subscriptions?package=be.bably.app';

export interface PlusOffer {
    label: string;
    price: string;
    package: PurchasesPackage;
}

let customer: string | null = null;

/**
 * The store customer is the household, not the person, so one purchase gives everyone in it
 * Plus; the server hears about it through the RevenueCat webhook.
 */
const actAs = async (householdIdentifier: string): Promise<void> => {
    if (customer === null) {
        await Purchases.configure({ apiKey: apiKey ?? '', appUserID: householdIdentifier });
    } else if (customer !== householdIdentifier) {
        await Purchases.logIn({ appUserID: householdIdentifier });
    }

    customer = householdIdentifier;
};

const labelOf = (aPackage: PurchasesPackage): string => {
    switch (aPackage.packageType) {
        case PACKAGE_TYPE.ANNUAL:
            return 'Per jaar';
        case PACKAGE_TYPE.MONTHLY:
            return 'Per maand';
        default:
            return aPackage.product.title;
    }
};

export const plusOffers = async (householdIdentifier: string): Promise<PlusOffer[]> => {
    await actAs(householdIdentifier);
    const { current } = await Purchases.getOfferings();

    return (current?.availablePackages ?? []).map((aPackage) => ({
        label: labelOf(aPackage),
        price: aPackage.product.priceString,
        package: aPackage,
    }));
};

/**
 * False when the buyer changed their mind in Google's sheet.
 */
export const buyPlus = async (householdIdentifier: string, offer: PlusOffer): Promise<boolean> => {
    await actAs(householdIdentifier);

    try {
        await Purchases.purchasePackage({ aPackage: offer.package });

        return true;
    } catch (error) {
        if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
            return false;
        }

        throw error;
    }
};

export const restorePlus = async (householdIdentifier: string): Promise<void> => {
    await actAs(householdIdentifier);
    await Purchases.restorePurchases();
};
