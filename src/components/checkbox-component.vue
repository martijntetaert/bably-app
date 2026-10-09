<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui';
import { useSlots } from 'vue';

defineProps<{
    disabled?: boolean;
}>();

const checked = defineModel<boolean | 'indeterminate'>({ required: true });

const slots = useSlots();
</script>
<template>
    <section class="component-checkbox-component">
        <!-- The label sits inside the control instead of next to it: a button cannot be the
             target of a <label>, and this way the whole row toggles and names the checkbox. -->
        <CheckboxRoot v-model="checked" :disabled="disabled" class="checkbox">
            <span class="box">
                <CheckboxIndicator class="indicator">
                    <i
                        :class="
                            checked === 'indeterminate'
                                ? 'fa-solid fa-minus'
                                : 'fa-solid fa-check'
                        "
                    ></i>
                </CheckboxIndicator>
            </span>
            <span v-if="slots.default" class="text">
                <slot></slot>
            </span>
        </CheckboxRoot>
    </section>
</template>
<style scoped>
@import '@css/components/checkbox-component.css';
</style>
