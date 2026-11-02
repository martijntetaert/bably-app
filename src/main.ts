import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import App from '@/App.vue';
import router from '@/router';
import { trackKeyboardInset } from '@/lib/keyboardInset';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/structure.css';

import '@fontsource-variable/figtree';
import '@fontsource-variable/bricolage-grotesque';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'vue-sonner/style.css';

import '@/theme/variables.css';
import '@/css/app.css';
import '@/theme/bably.css';
import '@/theme/ios.css';

/**
 * The web portal switches to dark with a class on <html>; the app follows the phone.
 */
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyScheme = (): void => {
    document.documentElement.classList.toggle('dark', darkScheme.matches);
};

/**
 * Ionic runs in its iOS mode on Android as well, so the iPhone look hangs on this instead.
 */
document.documentElement.dataset.platform = Capacitor.getPlatform();

// WebKit only shows :active press states once the page listens for touches.
document.addEventListener('touchstart', () => undefined, { passive: true });

applyScheme();
darkScheme.addEventListener('change', applyScheme);
trackKeyboardInset();

const app = createApp(App).use(IonicVue, { mode: 'ios', backButtonText: '', swipeBackEnabled: true }).use(router);

router.isReady().then(() => {
    app.mount('#app');
});
