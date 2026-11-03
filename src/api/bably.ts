import { Capacitor } from '@capacitor/core';
import { formData, request } from '@/api/client';
import { AuthInterface } from '@/interfaces/AuthInterface';
import { BarcodeInterface } from '@/interfaces/BarcodeInterface';
import { DashboardInterface } from '@/interfaces/DashboardInterface';
import { HouseholdInterface } from '@/interfaces/HouseholdInterface';
import { HouseholdInvitationInterface } from '@/interfaces/HouseholdInvitationInterface';
import { HouseholdOverviewInterface, InsightsInterface } from '@/interfaces/HouseholdOverviewInterface';
import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { MealInterface } from '@/interfaces/MealInterface';
import { MicroCategoryInterface } from '@/interfaces/MicroCategoryInterface';
import { NearbyPlaceInterface } from '@/interfaces/NearbyPlaceInterface';
import { PlaceSuggestionInterface } from '@/interfaces/PlaceSuggestionInterface';
import { ProductInterface } from '@/interfaces/ProductInterface';
import { ProfileInterface } from '@/interfaces/ProfileInterface';
import { RecipeInterface } from '@/interfaces/RecipeInterface';
import { RecurrenceInterface, RecurrenceValue } from '@/interfaces/RecurrenceInterface';
import { RegularGroceryInterface } from '@/interfaces/RegularGroceryInterface';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';
import { AddedGroceriesInterface, FinishedTripInterface, ShoppingListInterface } from '@/interfaces/ShoppingListInterface';
import { StockItemInterface, StockLevel } from '@/interfaces/StockItemInterface';
import { StoreInterface } from '@/interfaces/StoreInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { TaskListInterface } from '@/interfaces/TaskListInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { WeekMenuInterface } from '@/interfaces/WeekMenuInterface';

export const auth = {
    signIn: (email: string, password: string, deviceName: string) =>
        request<AuthInterface>('POST', 'auth/token', { email, password, device_name: deviceName }),
    register: (fields: { firstname: string; lastname: string; email: string; password: string; password_confirmation: string; household?: string }, deviceName: string) =>
        request<AuthInterface>('POST', 'auth/register', { ...fields, device_name: deviceName }),
    forgotPassword: (email: string) => request<{ status: string }>('POST', 'auth/forgot-password', { email }),
    signOut: () => request<void>('DELETE', 'auth/token'),
    resendVerification: () => request<void>('POST', 'auth/email/verification-notification'),
};

export const devices = {
    register: (token: string) => request<void>('POST', 'devices', { token, platform: Capacitor.getPlatform() }),
    forget: (token: string) => request<void>('DELETE', 'devices', { token }),
};

export const profile = {
    show: () => request<ProfileInterface>('GET', 'profile'),
    update: (firstname: string, lastname: string) => request<UserInterface>('PATCH', 'profile', { firstname, lastname }),
    updatePassword: (currentPassword: string, password: string, passwordConfirmation: string) =>
        request<void>('PATCH', 'profile/password', { current_password: currentPassword, password, password_confirmation: passwordConfirmation }),
    updateEmail: (email: string, currentPassword: string) => request<void>('PATCH', 'profile/email', { email, current_password: currentPassword }),
    updatePhoto: (photo: Blob) => request<UserInterface>('POST', 'profile/photo', formData({ photo })),
    deletePhoto: () => request<void>('DELETE', 'profile/photo'),
    createCalendarLink: () => request<{ calendarUrl: string }>('POST', 'profile/calendar'),
    deleteCalendarLink: () => request<void>('DELETE', 'profile/calendar'),
    updateTaskReminder: (wanted: boolean) => request<void>('PATCH', 'profile/task-reminder', { wanted }),
    updateTimezone: (timezone: string) => request<void>('PATCH', 'profile/timezone', { timezone }),
    deleteAccount: (currentPassword: string) => request<void>('DELETE', 'profile', { current_password: currentPassword }),
};

export const dashboard = {
    show: () => request<DashboardInterface>('GET', 'dashboard'),
    dismissStart: () => request<void>('POST', 'dashboard/start/dismiss'),
};

export const shopping = {
    list: () => request<ShoppingListInterface>('GET', 'shopping-list'),
    add: (fields: { name?: string; productIdentifier?: string; barcode?: string; quantity?: string | null }) =>
        request<AddedGroceriesInterface>('POST', 'grocery-items', fields),
    check: (identifier: string, checked: boolean) => request<void>('PATCH', `grocery-items/${identifier}/check`, { checked }),
    markMissing: (identifier: string, missing: boolean) => request<void>('PATCH', `grocery-items/${identifier}/missing`, { missing }),
    note: (identifier: string, note: string | null) => request<void>('PATCH', `grocery-items/${identifier}/note`, { note }),
    quantity: (identifier: string, quantity: string, identifiers: string[]) =>
        request<void>('PATCH', `grocery-items/${identifier}/quantity`, { quantity, identifiers }),
    remove: (identifier: string) => request<void>('DELETE', `grocery-items/${identifier}`),
    products: () => request<ProductInterface[]>('GET', 'products'),
    renameProduct: (identifier: string, name: string) => request<ProductInterface>('PATCH', `products/${identifier}`, { name }),
    mergeProduct: (identifier: string, target: string) =>
        request<ProductInterface>('POST', `products/${identifier}/merge`, { target }),
    setCategory: (identifier: string, category: string | null) =>
        request<ProductInterface>('PATCH', `products/${identifier}/category`, { category }),
    microCategories: () => request<MicroCategoryInterface[]>('GET', 'micro-categories'),
    linkBarcode: (identifier: string, ean: string) => request<ProductInterface>('POST', `products/${identifier}/barcodes`, { ean }),
    unlinkBarcode: (identifier: string, ean: string) =>
        request<ProductInterface>('DELETE', `products/${identifier}/barcodes/${ean}`),
    lookUpBarcode: (ean: string) => request<BarcodeInterface>('POST', 'barcodes/lookup', { ean }),
    suggestions: () => request<RegularGroceryInterface[]>('GET', 'products/suggestions'),
    stock: () => request<StockItemInterface[]>('GET', 'products/stock'),
    addStaple: (name: string) => request<void>('POST', 'products/staples', { name }),
    setStaple: (identifier: string, staple: boolean) => request<void>('PATCH', `products/${identifier}/staple`, { staple }),
    setStock: (identifier: string, level: StockLevel) => request<void>('PATCH', `products/${identifier}/stock`, { level }),
    snooze: (identifier: string) => request<void>('PATCH', `products/${identifier}/snooze`),
    startTrip: (storeIdentifier: string) => request<ShoppingTripInterface>('POST', 'shopping-trips', { storeIdentifier }),
    finishTrip: () => request<FinishedTripInterface>('POST', 'shopping-trips/finish'),
};

export interface StoreFields {
    name: string;
    place?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    startShopping?: boolean;
    googlePlaceId?: string | null;
    sessionToken?: string;
}

/**
 * Leaving googlePlaceId out of an update keeps the store's place; null unlinks it.
 */
export const stores = {
    list: () => request<StoreInterface[]>('GET', 'stores'),
    create: (fields: StoreFields) => request<StoreInterface>('POST', 'stores', { ...fields }),
    update: (identifier: string, fields: Pick<StoreFields, 'name' | 'place' | 'googlePlaceId' | 'sessionToken'>) =>
        request<StoreInterface>('PATCH', `stores/${identifier}`, { ...fields }),
    places: (search: string, sessionToken: string, near: { latitude: number; longitude: number } | null) =>
        request<PlaceSuggestionInterface[]>(
            'GET',
            `stores/places?${new URLSearchParams({
                search,
                sessionToken,
                ...(near ? { latitude: String(near.latitude), longitude: String(near.longitude) } : {}),
            })}`
        ),
    nearby: (latitude: number, longitude: number) =>
        request<NearbyPlaceInterface[]>(
            'GET',
            `stores/places/nearby?${new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) })}`
        ),
    answerLocationSuggestion: (identifier: string, isThisStore: boolean) =>
        request<StoreInterface>('PATCH', `stores/${identifier}/location-suggestion`, { isThisStore }),
    remove: (identifier: string) => request<void>('DELETE', `stores/${identifier}`),
    resetRoute: (identifier: string) => request<void>('DELETE', `stores/${identifier}/route`),
    recognize: (latitude: number, longitude: number) => request<{ store: StoreInterface | null }>('POST', 'stores/recognition', { latitude, longitude }),
};

export interface MealFields {
    eatenOn?: string;
    recipeIdentifier?: string | null;
    name?: string | null;
    eaterIdentifiers?: string[];
    guests?: number;
}

export interface RecipeFields {
    name: string;
    baseServings: number;
    ingredients: { name: string; amount: string | null }[];
    steps: string[];
    sourceUrl?: string | null;
    photo?: Blob | null;
    importedPhotoUrl?: string | null;
    removePhoto?: boolean;
}

export interface ImportedRecipeInterface {
    name: string;
    baseServings: number;
    ingredients: IngredientLineInterface[];
    steps: string[];
    photoUrl: string | null;
    sourceUrl: string;
}

export const meals = {
    week: (week?: string) => request<WeekMenuInterface>('GET', week === undefined ? 'meals' : `meals?week=${week}`),
    plan: (fields: MealFields) => request<MealInterface>('POST', 'meals', { ...fields }),
    update: (identifier: string, fields: MealFields) => request<void>('PATCH', `meals/${identifier}`, { ...fields }),
    remove: (identifier: string) => request<void>('DELETE', `meals/${identifier}`),
    planLeftover: (identifier: string, fields: { eatenOn: string; eaterIdentifiers?: string[]; guests?: number }) =>
        request<void>('POST', `meals/${identifier}/leftovers`, fields),
};

export const recipes = {
    list: () => request<RecipeInterface[]>('GET', 'recipes'),
    create: (fields: RecipeFields) => request<RecipeInterface>('POST', 'recipes', formData({ ...fields })),
    update: (identifier: string, fields: RecipeFields) => request<RecipeInterface>('POST', `recipes/${identifier}`, formData({ ...fields }, 'PATCH')),
    remove: (identifier: string) => request<void>('DELETE', `recipes/${identifier}`),
    import: (url: string) => request<{ recipe: ImportedRecipeInterface }>('POST', 'recipes/import', { url }),
};

export interface TaskFields {
    title: string;
    userIdentifier?: string;
    dueOn?: string;
    recurrence?: RecurrenceValue;
    recurrenceInterval?: number;
    recurrenceDays?: number[] | null;
}

export const tasks = {
    list: () => request<TaskListInterface>('GET', 'tasks'),
    recurrences: () => request<RecurrenceInterface[]>('GET', 'tasks/recurrences'),
    create: (fields: TaskFields) => request<TaskInterface>('POST', 'tasks', { ...fields }),
    update: (identifier: string, fields: TaskFields) => request<TaskInterface>('PATCH', `tasks/${identifier}`, { ...fields }),
    assign: (identifier: string, userIdentifier: string) => request<void>('PATCH', `tasks/${identifier}/assignee`, { userIdentifier }),
    complete: (identifier: string, finished: boolean) => request<void>('PATCH', `tasks/${identifier}/completion`, { finished }),
    remove: (identifier: string) => request<void>('DELETE', `tasks/${identifier}`),
};

export const household = {
    show: () => request<HouseholdOverviewInterface>('GET', 'household'),
    members: () => request<UserInterface[]>('GET', 'household/members'),
    rename: (name: string) => request<HouseholdInterface>('PATCH', 'household', { name }),
    followAlongLive: (followsAlongLive: boolean) => request<HouseholdInterface>('PATCH', 'household/live', { followsAlongLive }),
    leave: () => request<void>('POST', 'household/leave'),
    removeMember: (identifier: string) => request<void>('DELETE', `household/members/${identifier}`),
    invite: (email: string) => request<HouseholdInvitationInterface>('POST', 'household/invitations', { email }),
    cancelInvitation: (identifier: string) => request<void>('DELETE', `household/invitations/${identifier}`),
    insights: (month?: string) => request<InsightsInterface>('GET', month === undefined ? 'household/insights' : `household/insights?month=${month}`),
};
