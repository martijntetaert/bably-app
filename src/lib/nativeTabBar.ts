import { onBeforeUnmount, watch, type Ref } from 'vue';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

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
let height = 0;

/**
 * The bar lies over the web view, so it steps aside for whatever covers the screen: a page
 * outside the tabs, a sheet or a dialog. While it shows, pages keep room for it at the bottom.
 */
const applyVisibility = (): void => {
    const isVisible = isOnTabs && openOverlays === 0;

    document.documentElement.style.setProperty('--native-tab-bar-height', isOnTabs ? `${height}px` : '0px');
    void NativeTabBar.setVisible({ visible: isVisible }).catch(() => undefined);
};

export const configureNativeTabBar = async (tabs: NativeTab[], selected?: string): Promise<void> => {
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
