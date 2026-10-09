<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';

defineProps<{
    label: string;
}>();

const checked = defineModel<boolean>({ required: true });
</script>
<template>
    <section class="component-toggle-component">
        <SwitchRoot v-model="checked" class="switch" :aria-label="label">
            <SwitchThumb class="thumb" />
        </SwitchRoot>
    </section>
</template>
<style scoped>
@import '@css/components/toggle-component.css';
</style>
