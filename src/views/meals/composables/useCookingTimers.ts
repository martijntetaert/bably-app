import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { computed, onBeforeUnmount, ref, type ComputedRef } from 'vue';

export interface CookingTimer {
    id: number;
    label: string;
    endsAt: number;
}

export interface RunningCookingTimer extends CookingTimer {
    remaining: number;
    isDone: boolean;
}

const CHANNEL = 'timers';

/**
 * Timers count towards a moment instead of down per second, so a phone that pauses the
 * app in the background is still right when it wakes up. Each timer also schedules a
 * notification, which rings with the screen off or the app closed.
 */
export function useCookingTimers(): {
    timers: ComputedRef<RunningCookingTimer[]>;
    start: (label: string, seconds: number, dish: string) => Promise<void>;
    stop: (id: number) => void;
} {
    const running = ref<CookingTimer[]>([]);
    const now = ref(Date.now());
    const rung = new Set<number>();
    let ticker: number | null = null;
    let canNotify: boolean | null = null;
    let audio: AudioContext | null = null;
    // Notification ids are Java ints and outlive the app, so they must not repeat after a restart.
    let nextId = Math.floor(Math.random() * 1_000_000_000);

    const beep = (): void => {
        if (!audio) {
            return;
        }

        const context = audio;

        [0, 0.35, 0.7].forEach((offset) => {
            const tone = context.createOscillator();
            const volume = context.createGain();
            tone.frequency.value = 880;
            volume.gain.setValueAtTime(0.25, context.currentTime + offset);
            volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.3);
            tone.connect(volume).connect(context.destination);
            tone.start(context.currentTime + offset);
            tone.stop(context.currentTime + offset + 0.3);
        });
    };

    const ring = (): void => {
        void Haptics.vibrate({ duration: 900 }).catch(() => undefined);

        // The notification already makes a sound; without it the timer beeps itself.
        if (!canNotify) {
            beep();
        }
    };

    const tick = (): void => {
        now.value = Date.now();

        running.value
            .filter((timer) => timer.endsAt <= now.value && !rung.has(timer.id))
            .forEach((timer) => {
                rung.add(timer.id);
                ring();
            });
    };

    const ensureTicker = (): void => {
        if (ticker === null) {
            ticker = window.setInterval(tick, 500);
        }
    };

    const stopTicker = (): void => {
        if (ticker !== null && running.value.length === 0) {
            window.clearInterval(ticker);
            ticker = null;
        }
    };

    const prepareNotifications = async (): Promise<boolean> => {
        if (canNotify !== null) {
            return canNotify;
        }

        try {
            let { display } = await LocalNotifications.checkPermissions();

            if (display === 'prompt' || display === 'prompt-with-rationale') {
                display = (await LocalNotifications.requestPermissions()).display;
            }

            canNotify = display === 'granted';

            if (canNotify) {
                await LocalNotifications.createChannel({
                    id: CHANNEL,
                    name: 'Kookwekkers',
                    description: 'Een timer uit de kookmodus die afloopt',
                    importance: 5,
                    visibility: 1,
                    vibration: true,
                }).catch(() => undefined);
            }
        } catch {
            canNotify = false;
        }

        return canNotify;
    };

    // Without the exact alarm permission Android would open its settings screen mid-cooking;
    // an inexact alarm is close enough while cook mode keeps the screen on.
    const mayRingExactly = async (): Promise<boolean> => {
        try {
            return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
        } catch {
            return false;
        }
    };

    const schedule = async (timer: CookingTimer, dish: string): Promise<void> => {
        if (!(await prepareNotifications())) {
            return;
        }

        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: timer.id,
                        title: `${timer.label} is om`,
                        body: dish,
                        channelId: CHANNEL,
                        schedule: { at: new Date(timer.endsAt), allowWhileIdle: true },
                        isExactNotification: await mayRingExactly(),
                    },
                ],
            });
        } catch {
            canNotify = false;
        }
    };

    // The sound may only start from a tap, so the first timer unlocks it.
    const start = async (label: string, seconds: number, dish: string): Promise<void> => {
        try {
            audio ??= new AudioContext();
            void audio.resume();
        } catch {
            audio = null;
        }

        const timer = { id: nextId++, label, endsAt: Date.now() + seconds * 1000 };
        running.value.push(timer);
        tick();
        ensureTicker();

        await schedule(timer, dish);
    };

    const stop = (id: number): void => {
        running.value = running.value.filter((timer) => timer.id !== id);
        rung.delete(id);
        stopTicker();
        void LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => undefined);
    };

    onBeforeUnmount(() => {
        if (ticker !== null) {
            window.clearInterval(ticker);
        }

        const pending = running.value.filter((timer) => !rung.has(timer.id));

        if (pending.length > 0) {
            void LocalNotifications.cancel({ notifications: pending.map(({ id }) => ({ id })) }).catch(() => undefined);
        }

        void audio?.close();
    });

    const timers = computed(() =>
        running.value.map((timer) => ({
            ...timer,
            remaining: timer.endsAt - now.value,
            isDone: timer.endsAt <= now.value,
        })),
    );

    return { timers, start, stop };
}
