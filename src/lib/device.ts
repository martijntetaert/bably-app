import { Capacitor } from '@capacitor/core';

export const Device = {
    /**
     * Names the token on the server, so a lost phone can be told apart from the others.
     */
    async name(): Promise<string> {
        const platform = Capacitor.getPlatform();
        const model = navigator.userAgent.match(/Android [\d.]+; ([^;)]+)/)?.[1]?.trim();

        return model !== undefined ? `Bably-app op ${model}` : `Bably-app (${platform})`;
    },
};
