<script setup lang="ts">
import { ref, watch } from 'vue';
import ButtonComponent from '@/components/button-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { household } from '@/api/bably';
import { useSubmission } from '@/views/household/composables/useSubmission';

const props = defineProps<{
    name: string;
}>();

const emit = defineEmits<{
    saved: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const newName = ref('');
const { processing, errors, clearErrors, submit } = useSubmission();

watch(open, (isOpen) => {
    if (isOpen) {
        newName.value = props.name;
        clearErrors();
    }
});

const save = async (): Promise<void> => {
    if (await submit(() => household.rename(newName.value.trim()))) {
        open.value = false;
        emit('saved');
    }
};
</script>
<template>
    <section class="section-portal-household-users-household-name">
        <drawer-component
            v-model:open="open"
            title="Naam van het huishouden"
            description="Staat bovenaan Huis en in de uitnodigingen."
        >
            <form-component class="form" @submit="save()">
                <div class="field">
                    <section-label-component>Naam</section-label-component>
                    <input-component
                        v-model="newName"
                        name="household"
                        placeholder="Gezin Tetaert"
                        autocomplete="off"
                        required
                    />
                    <p v-if="errors.name" class="error">
                        {{ errors.name }}
                    </p>
                </div>
                <div class="actions">
                    <button-component type="submit" :disabled="processing || newName.trim() === ''">
                        Bewaren
                    </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/users/sections/household-name.css';
</style>
