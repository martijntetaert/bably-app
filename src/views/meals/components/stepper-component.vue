<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { add, remove } from '@/lib/icons';

const props = defineProps<{
    modelValue: number;
    min: number;
    max: number;
    label: string;
    unit?: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: number];
}>();

const change = (by: number): void => {
    emit('update:modelValue', Math.min(props.max, Math.max(props.min, props.modelValue + by)));
};
</script>
<template>
    <div class="stepper" role="group" :aria-label="label">
        <ion-button fill="clear" size="small" :disabled="modelValue <= min" :aria-label="`${label}: minder`" @click.stop="change(-1)">
            <i slot="icon-only" :class="remove" aria-hidden="true"></i>
        </ion-button>
        <span class="value" aria-live="polite">
            <strong>{{ modelValue }}</strong>
            <span v-if="unit" class="unit">{{ unit }}</span>
        </span>
        <ion-button fill="clear" size="small" :disabled="modelValue >= max" :aria-label="`${label}: meer`" @click.stop="change(1)">
            <i slot="icon-only" :class="add" aria-hidden="true"></i>
        </ion-button>
    </div>
</template>
<style scoped>
.stepper {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--bably-muted);
}

.stepper ion-button {
    --padding-start: 0.4rem;
    --padding-end: 0.4rem;
    margin: 0;
    height: 2.25rem;
}

.value {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    min-width: 2.25rem;
    line-height: 1.05;
}

.value strong {
    font-size: 1rem;
}

.unit {
    font-size: 0.65rem;
    color: var(--bably-muted-text);
}
</style>
