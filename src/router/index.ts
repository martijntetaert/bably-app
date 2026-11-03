import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useSession } from '@/composables/useSession';
import TabsPage from '@/views/tabs-page.vue';

declare module 'vue-router' {
    interface RouteMeta {
        guest?: boolean;
        unverified?: boolean;
    }
}

const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/tabs/dashboard' },
    { path: '/login', component: () => import('@/views/auth/login-page.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('@/views/auth/register-page.vue'), meta: { guest: true } },
    { path: '/forgot-password', component: () => import('@/views/auth/forgot-password-page.vue'), meta: { guest: true } },
    { path: '/verify-email', component: () => import('@/views/auth/verify-email-page.vue'), meta: { unverified: true } },
    { path: '/settings', component: () => import('@/views/settings/settings-page.vue') },
    { path: '/products', component: () => import('@/views/products/products-page.vue') },
    {
        path: '/tabs/',
        component: TabsPage,
        children: [
            { path: '', redirect: '/tabs/dashboard' },
            { path: 'dashboard', component: () => import('@/views/dashboard/dashboard-page.vue') },
            { path: 'shopping', component: () => import('@/views/shopping/shopping-page.vue') },
            { path: 'meals', component: () => import('@/views/meals/meals-page.vue') },
            { path: 'household', component: () => import('@/views/household/household-page.vue') },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.beforeEach(async (to) => {
    const session = useSession();
    await session.restore();

    if (!session.isSignedIn.value) {
        return to.meta.guest === true ? true : '/login';
    }

    if (!session.isVerified.value) {
        return to.meta.unverified === true ? true : '/verify-email';
    }

    if (to.meta.guest === true || to.meta.unverified === true) {
        return '/tabs/dashboard';
    }

    return true;
});

export default router;
