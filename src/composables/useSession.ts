import { computed, ref } from 'vue';
import { Device } from '@/lib/device';
import { auth, profile as profileApi } from '@/api/bably';
import { loadToken, storeToken } from '@/api/client';
import { AuthInterface } from '@/interfaces/AuthInterface';
import { ProfileInterface } from '@/interfaces/ProfileInterface';

const token = ref<string | null>(null);
const profile = ref<ProfileInterface | null>(null);
const restored = ref(false);

export function useSession() {
    const isSignedIn = computed(() => token.value !== null);
    const isVerified = computed(() => profile.value?.emailVerified === true);
    const user = computed(() => profile.value?.user ?? null);

    const restore = async (): Promise<void> => {
        if (restored.value) {
            return;
        }

        token.value = await loadToken();
        restored.value = true;

        if (token.value !== null) {
            await refreshProfile().catch(() => undefined);
        }
    };

    const refreshProfile = async (): Promise<ProfileInterface> => {
        profile.value = await profileApi.show();

        return profile.value;
    };

    const start = async (result: AuthInterface): Promise<void> => {
        await storeToken(result.token);
        token.value = result.token;
        await refreshProfile();
    };

    const signIn = async (email: string, password: string): Promise<void> => {
        await start(await auth.signIn(email, password, await Device.name()));
    };

    const register = async (fields: Parameters<typeof auth.register>[0]): Promise<void> => {
        await start(await auth.register(fields, await Device.name()));
    };

    const forget = async (): Promise<void> => {
        await storeToken(null);
        token.value = null;
        profile.value = null;
    };

    const signOut = async (): Promise<void> => {
        await auth.signOut().catch(() => undefined);
        await forget();
    };

    return { token, profile, user, isSignedIn, isVerified, restore, refreshProfile, signIn, register, signOut, forget };
}
