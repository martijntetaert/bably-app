import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { devices } from '@/api/bably';
import router from '@/router';

const DEVICE_TOKEN_KEY = 'bably.device-token';
const OPT_OUT_KEY = 'bably.push-opt-out';

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
        '/portal/household/users': '/tabs/household?segment=members',
        '/portal/household/insights': '/tabs/household?segment=insights',
        '/portal/settings': '/settings',
    };
    const screen = screens[path] ?? '/tabs/dashboard';

    return query === undefined ? screen : `${screen}${screen.includes('?') ? '&' : '?'}${query}`;
}

let listening = false;

export function usePush() {
    const platform = Capacitor.getPlatform();
    const isAvailable = (platform === 'android' && __HAS_FIREBASE_ANDROID__) || (platform === 'ios' && __HAS_FIREBASE_IOS__);

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

    const hasOptedOut = async (): Promise<boolean> => (await Preferences.get({ key: OPT_OUT_KEY })).value !== null;

    /**
     * Android keeps the permission after switching pushes off in Bably, so that choice is
     * remembered on its own.
     */
    const isEnabled = async (): Promise<boolean> => (await isAllowed()) && !(await hasOptedOut());

    /**
     * Asks once; Android 13 and up show the system question, older versions allow it.
     */
    const enable = async (): Promise<boolean> => {
        if (!isAvailable) {
            return false;
        }

        await Preferences.remove({ key: OPT_OUT_KEY });
        await listen();

        if (platform === 'android') {
            await PushNotifications.deleteChannel({ id: 'default' }).catch(() => undefined);
            await PushNotifications.createChannel({
                id: 'household',
                name: 'Huishouden',
                description: 'Wie gaat winkelen, wat er nog bij moet en je taken van de dag',
                importance: 4,
                visibility: 1,
                vibration: true,
            });
        }

        const { receive } = await PushNotifications.requestPermissions();

        if (receive !== 'granted') {
            return false;
        }

        await PushNotifications.register();

        return true;
    };

    /**
     * Android's permission question pauses the WebView; asked during a page transition it
     * freezes the animation and leaves the screen blank, so it waits until the page is in.
     */
    const enableAfterNavigation = (): void => {
        window.setTimeout(() => void enable(), 800);
    };

    const resume = async (): Promise<void> => {
        if (await isEnabled()) {
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

    const disable = async (): Promise<void> => {
        await forget();
        await Preferences.set({ key: OPT_OUT_KEY, value: '1' });
    };

    return { isAvailable, isAllowed, isEnabled, enable, enableAfterNavigation, disable, resume, forget };
}
