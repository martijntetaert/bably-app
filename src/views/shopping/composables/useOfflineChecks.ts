import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { shopping } from '@/api/bably';
import { ApiError } from '@/api/client';

type PendingCheck = { id: number; identifier: string; checked: boolean };
type SettledCheck = { identifier: string; checked: boolean; settledAt: number };

export type UseOfflineChecksReturn = {
    checkedState: (identifier: string, fallback: boolean) => boolean;
    setChecked: (identifier: string, checked: boolean) => void;
    forgetSettledBefore: (moment: number) => void;
    onSynced: (listener: () => void) => () => void;
    flush: () => Promise<void>;
    pendingCount: ComputedRef<number>;
    isOnline: Ref<boolean>;
};

const STORAGE_KEY = 'bably.pending-checks';

// One queue for the whole app, so the list and the finish button see the same ticks.
const pending = ref<PendingCheck[]>([]);
// Ticks the server has but the loaded list does not show yet; dropped once a newer list arrives.
const settled = ref<SettledCheck[]>([]);
const isOnline = ref(true);
const syncedListeners = new Set<() => void>();
let nextId = Date.now();
let isFlushing = false;
let started: Promise<void> | null = null;

async function save(checks: PendingCheck[]): Promise<void> {
    pending.value = checks;
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(checks) }).catch(() => undefined);
}

async function restore(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY }).catch(() => ({ value: null }));

    try {
        const stored = JSON.parse(value ?? '[]') as PendingCheck[];
        pending.value = [...stored, ...pending.value.filter((check) => !stored.some((old) => old.identifier === check.identifier))];
    } catch {
        pending.value = [];
    }
}

function forget(id: number): Promise<void> {
    return save(pending.value.filter((check) => check.id !== id));
}

/**
 * Resolves true when the server has the tick, false when the network is gone. A tick the
 * server refuses (the item was taken off the list meanwhile) is dropped, not retried.
 */
async function send(check: PendingCheck): Promise<boolean> {
    try {
        await shopping.check(check.identifier, check.checked);
        settled.value = [
            ...settled.value.filter((done) => done.identifier !== check.identifier),
            { identifier: check.identifier, checked: check.checked, settledAt: Date.now() },
        ];
    } catch (error) {
        if (error instanceof ApiError && error.isOffline) {
            isOnline.value = false;

            return false;
        }
    }

    isOnline.value = true;
    await forget(check.id);

    return true;
}

/**
 * Sends the waiting ticks one by one, in the order they were made: that order is what
 * teaches the store's route.
 */
async function flush(): Promise<void> {
    if (isFlushing || pending.value.length === 0) {
        return;
    }

    isFlushing = true;
    let sent = 0;

    try {
        while (pending.value.length > 0) {
            if (!(await send(pending.value[0]))) {
                break;
            }

            sent++;
        }
    } finally {
        isFlushing = false;
    }

    if (sent > 0) {
        syncedListeners.forEach((listener) => listener());
    }
}

function start(): Promise<void> {
    started ??= (async () => {
        await restore();
        isOnline.value = (await Network.getStatus().catch(() => ({ connected: true }))).connected;

        await Network.addListener('networkStatusChange', ({ connected }) => {
            isOnline.value = connected;

            if (connected) {
                void flush();
            }
        }).catch(() => undefined);

        await App.addListener('resume', () => void flush()).catch(() => undefined);

        void flush();
    })();

    return started;
}

export function useOfflineChecks(): UseOfflineChecksReturn {
    void start();

    const checkedState = (identifier: string, fallback: boolean): boolean =>
        pending.value.find((check) => check.identifier === identifier)?.checked ??
        settled.value.find((check) => check.identifier === identifier)?.checked ??
        fallback;

    /**
     * The tick shows at once and waits in the queue until the server has it. A later tick on
     * the same item replaces the earlier one and moves to the back of the line.
     */
    const setChecked = (identifier: string, checked: boolean): void => {
        void save([...pending.value.filter((check) => check.identifier !== identifier), { id: nextId++, identifier, checked }]).then(
            () => flush(),
        );
    };

    const forgetSettledBefore = (moment: number): void => {
        settled.value = settled.value.filter((check) => check.settledAt >= moment);
    };

    const onSynced = (listener: () => void): (() => void) => {
        syncedListeners.add(listener);

        return () => syncedListeners.delete(listener);
    };

    return {
        checkedState,
        setChecked,
        forgetSettledBefore,
        onSynced,
        flush,
        pendingCount: computed(() => pending.value.length),
        isOnline,
    };
}
