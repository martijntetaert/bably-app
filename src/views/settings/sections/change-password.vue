<script setup lang="ts">
import { ref, watch } from 'vue';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import ButtonComponent from '@/components/button-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

const open = defineModel<boolean>('open', { required: true });

const toast = useToast();

const currentPassword = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        currentPassword.value = '';
        password.value = '';
        passwordConfirmation.value = '';
        errors.value = {};
    }
});

const save = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};

    try {
        await profileApi.updatePassword(currentPassword.value, password.value, passwordConfirmation.value);
        open.value = false;
        toast.success('Je wachtwoord is aangepast.');
    } catch (error) {
        password.value = '';
        passwordConfirmation.value = '';

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
    <section class="section-portal-settings-change-password">
        <drawer-component
            v-model:open="open"
            title="Wachtwoord wijzigen"
            description="Je blijft aangemeld op dit toestel."
        >
            <form-component class="form" @submit="save()">
                <div class="field">
                    <section-label-component>Huidig wachtwoord</section-label-component>
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
                <div class="field">
                    <section-label-component>Nieuw wachtwoord</section-label-component>
                    <input-component
                        v-model="password"
                        type="password"
                        name="password"
                        autocomplete="new-password"
                        required
                    />
                </div>
                <div class="field">
                    <section-label-component>Herhaal nieuw wachtwoord</section-label-component>
                    <input-component
                        v-model="passwordConfirmation"
                        type="password"
                        name="password_confirmation"
                        autocomplete="new-password"
                        required
                    />
                    <p v-if="errors.password" class="error">
                        {{ errors.password[0] }}
                    </p>
                </div>

                <div class="actions">
                    <button-component type="submit" :disabled="processing"> Bewaren </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/change-password.css';
</style>
