import { onBeforeUnmount, watch, type Ref } from 'vue';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

interface NativeTab {
    id: string;
    title: string;
    symbol: string;
}

interface NativeTabBarPlugin {
    configure(options: { tabs: NativeTab[]; selected?: string }): Promise<{ height: number }>;
    select(options: { id: string }): Promise<void>;
    setVisible(options: { visible: boolean }): Promise<void>;
    addListener(event: 'tabSelected', listener: (data: { id: string }) => void): Promise<PluginListenerHandle>;
}

export const hasNativeTabBar = Capacitor.getPlatform() === 'ios';

export const NativeTabBar = registerPlugin<NativeTabBarPlugin>('NativeTabBar');

let isOnTabs = false;
let openOverlays = 0;
let isKeyboardOpen = false;
let height = 0;

/**
 * The bar lies over the web view, so it steps aside for whatever covers the screen: a page
 * outside the tabs, a sheet, a dialog or the keyboard. While it shows, pages keep room for it
 * at the bottom; under the keyboard a page's bottom bar rests on the keys instead.
 */
const applyVisibility = (): void => {
    const isVisible = isOnTabs && openOverlays === 0 && !isKeyboardOpen;
    const room = isOnTabs && !isKeyboardOpen ? height : 0;

    document.documentElement.style.setProperty('--native-tab-bar-height', `${room}px`);
    void NativeTabBar.setVisible({ visible: isVisible }).catch(() => undefined);
};

const followKeyboard = (isOpen: boolean): void => {
    isKeyboardOpen = isOpen;
    applyVisibility();
};

let isFollowingKeyboard = false;

export const configureNativeTabBar = async (tabs: NativeTab[], selected?: string): Promise<void> => {
    if (!isFollowingKeyboard) {
        isFollowingKeyboard = true;
        await Keyboard.addListener('keyboardWillShow', () => followKeyboard(true));
        await Keyboard.addListener('keyboardWillHide', () => followKeyboard(false));
    }

    height = (await NativeTabBar.configure({ tabs, selected })).height;
    applyVisibility();
};

export const setOnTabs = (isOn: boolean): void => {
    isOnTabs = isOn;
    applyVisibility();
};

export function hideNativeTabBarWhile(open: Ref<boolean>): void {
    if (!hasNativeTabBar) {
        return;
    }

    let isCounted = false;

    const count = (isOpen: boolean): void => {
        if (isOpen === isCounted) {
            return;
        }

        isCounted = isOpen;
        openOverlays += isOpen ? 1 : -1;
        applyVisibility();
    };

    watch(open, count, { immediate: true });
    onBeforeUnmount(() => count(false));
}
