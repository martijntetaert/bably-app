<script setup lang="ts">
import { ref, watch } from 'vue';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import ButtonComponent from '@/components/button-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

const props = defineProps<{
    email: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();

const newEmail = ref('');
const currentPassword = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        newEmail.value = '';
        currentPassword.value = '';
        errors.value = {};
    }
});

const save = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};

    try {
        const email = newEmail.value.trim();
        await profileApi.updateEmail(email, currentPassword.value);
        await session.refreshProfile().catch(() => undefined);
        open.value = false;
        toast.success(`Kijk in de mailbox van ${email} om het te bevestigen.`);
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
    <section class="section-portal-settings-change-email">
        <drawer-component
            v-model:open="open"
            title="E-mailadres wijzigen"
            :description="`Nu meld je je aan met ${props.email}. Het nieuwe adres telt pas als je het bevestigt vanuit die mailbox.`"
        >
            <form-component class="form" @submit="save()">
                <div class="field">
                    <section-label-component>Nieuw e-mailadres</section-label-component>
                    <input-component v-model="newEmail" type="email" name="email" autocomplete="email" required />
                    <p v-if="errors.email" class="error">
                        {{ errors.email[0] }}
                    </p>
                </div>
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
                    <button-component
                        type="submit"
                        :disabled="processing || newEmail.trim() === '' || currentPassword === ''"
                    >
                        Stuur bevestiging
                    </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/change-email.css';
</style>
