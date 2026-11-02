export type PlusReason = 'trial' | 'play_store' | 'app_store' | 'test_store' | 'granted';

export interface PlusInterface {
    householdIdentifier: string;
    active: boolean;
    reason: PlusReason | null;
    endsAt: string | null;
}
