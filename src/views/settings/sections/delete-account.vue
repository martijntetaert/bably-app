<script setup lang="ts">
import { ref, watch } from 'vue';
import { useIonRouter } from '@ionic/vue';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import ButtonComponent from '@/components/button-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

defineProps<{
    isLastMember: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const push = usePush();
const toast = useToast();
const ionRouter = useIonRouter();

const currentPassword = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        currentPassword.value = '';
        errors.value = {};
    }
});

const destroy = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};

    try {
        await profileApi.deleteAccount(currentPassword.value);
        open.value = false;
        await push.forget();
        await session.forget();
        ionRouter.navigate('/login', 'root', 'replace');
    } catch (error) {
        currentPassword.value = '';

        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        processing.value = false;
    }
};
</script>
<template>
    <section class="section-portal-settings-delete-account">
        <drawer-component
            v-model:open="open"
            title="Account verwijderen?"
            description="Dit kan je niet ongedaan maken."
        >
            <form-component class="form" @submit="destroy()">
                <p class="warning">
                    {{
                        isLastMember
                            ? 'Je bent de laatste in dit huishouden: de lijst, het menu, de recepten, de voorraad en de taken verdwijnen mee.'
                            : 'Je verdwijnt uit het huishouden. Je open taken gaan naar een ander lid; de rest blijft voor hen.'
                    }}
                </p>
                <div class="field">
                    <section-label-component>Je wachtwoord</section-label-component>
                    <input-component
                        v-model="currentPassword"
                        type="password"
                        name="current_password"
                        autocomplete="current-password"
                        required
                    />
                    <p v-if="errors.current_password" class="error">
                        {{ errors.current_password[0] }}
                    </p>
                </div>
                <div class="actions">
                    <button-component type="submit" variant="danger" :disabled="processing || currentPassword === ''">
                        Account verwijderen
                    </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/delete-account.css';
</style>
