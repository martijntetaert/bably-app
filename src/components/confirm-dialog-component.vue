<script setup lang="ts">
import { useCloseOnBack } from '@/composables/useCloseOnBack';
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogRoot,
    AlertDialogTitle,
} from 'reka-ui';

withDefaults(
    defineProps<{
        title: string;
        description: string;
        confirmLabel?: string;
        secondaryLabel?: string;
        processing?: boolean;
    }>(),
    {
        confirmLabel: 'Verwijderen',
        processing: false,
    },
);

const open = defineModel<boolean>('open', { required: true });

useCloseOnBack(open);

const emit = defineEmits<{
    confirm: [];
    secondary: [];
}>();
</script>
<template>
    <AlertDialogRoot v-model:open="open">
        <AlertDialogPortal>
            <AlertDialogOverlay class="confirm-dialog-overlay" />
            <AlertDialogContent class="confirm-dialog-content">
                <AlertDialogTitle class="title">{{ title }}</AlertDialogTitle>
                <AlertDialogDescription class="description">{{
                    description
                }}</AlertDialogDescription>
                <div class="actions">
                    <AlertDialogCancel class="cancel"
                        >Annuleren</AlertDialogCancel
                    >
                    <!-- The action would close the dialog before the request runs; the parent closes it on success. -->
                    <AlertDialogAction
                        class="confirm"
                        :disabled="processing"
                        @click.prevent="emit('confirm')"
                    >
                        {{ confirmLabel }}
                    </AlertDialogAction>
                </div>
                <button
                    v-if="secondaryLabel"
                    type="button"
                    class="secondary"
                    :disabled="processing"
                    @click="emit('secondary')"
                >
                    {{ secondaryLabel }}
                </button>
            </AlertDialogContent>
        </AlertDialogPortal>
    </AlertDialogRoot>
</template>
<style scoped>
@import '@css/components/confirm-dialog-component.css';
</style>
