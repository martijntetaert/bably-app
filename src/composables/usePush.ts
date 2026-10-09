import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { devices } from '@/api/bably';
import router from '@/router';

const DEVICE_TOKEN_KEY = 'bably.device-token';

/**
 * The server sends the portal path of what a push is about; the app opens its own screen
 * for it.
 */
export function appPathFor(portalUrl: string): string {
    const [path, query] = portalUrl.split('?');
    const screens: Record<string, string> = {
        '/portal/shopping': '/tabs/shopping',
        '/portal/meals': '/tabs/meals',
        '/portal/household/tasks': '/tabs/household',
        '/portal/household/users': '/tabs/household',
        '/portal/settings': '/settings',
    };
    const screen = screens[path] ?? '/tabs/dashboard';

    return query === undefined ? screen : `${screen}?${query}`;
}

let listening = false;

export function usePush() {
    const isAvailable = Capacitor.isNativePlatform();

    const listen = async (): Promise<void> => {
        if (listening) {
            return;
        }

        listening = true;

        await PushNotifications.addListener('registration', async ({ value }) => {
            await Preferences.set({ key: DEVICE_TOKEN_KEY, value });
            await devices.register(value).catch(() => undefined);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
            const url = notification.data?.url;

            if (typeof url === 'string') {
                router.push(appPathFor(url));
            }
        });
    };

    const isAllowed = async (): Promise<boolean> =>
        isAvailable && (await PushNotifications.checkPermissions()).receive === 'granted';

    /**
     * Asks once; Android 13 and up show the system question, older versions allow it.
     */
    const enable = async (): Promise<boolean> => {
        if (!isAvailable) {
            return false;
        }

        await listen();
        await PushNotifications.createChannel({ id: 'default', name: 'Bably', importance: 4 });

        const { receive } = await PushNotifications.requestPermissions();

        if (receive !== 'granted') {
            return false;
        }

        await PushNotifications.register();

        return true;
    };

    const resume = async (): Promise<void> => {
        if (await isAllowed()) {
            await enable();
        }
    };

    const forget = async (): Promise<void> => {
        const { value } = await Preferences.get({ key: DEVICE_TOKEN_KEY });

        if (value !== null) {
            await devices.forget(value).catch(() => undefined);
            await Preferences.remove({ key: DEVICE_TOKEN_KEY });
        }

        if (isAvailable) {
            await PushNotifications.unregister().catch(() => undefined);
        }
    };

    return { isAvailable, isAllowed, enable, resume, forget };
}
