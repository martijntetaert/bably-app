<script setup lang="ts">
import {
    DrawerContent,
    DrawerDescription,
    DrawerHandle,
    DrawerOverlay,
    DrawerPortal,
    DrawerRoot,
    DrawerTitle,
    DrawerViewport,
} from 'reka-ui';
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    description?: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const descriptionAttributes = computed(() =>
    props.description ? {} : { 'aria-describedby': undefined },
);
</script>
<template>
    <DrawerRoot v-model:open="open">
        <DrawerPortal>
            <DrawerOverlay class="drawer-overlay" />
            <DrawerContent
                class="drawer-content"
                v-bind="descriptionAttributes"
            >
                <DrawerHandle class="handle" />
                <div class="titles">
                    <DrawerTitle class="title">
                        {{ title }}
                    </DrawerTitle>
                    <DrawerDescription v-if="description" class="description">
                        {{ description }}
                    </DrawerDescription>
                </div>
                <DrawerViewport class="body">
                    <slot></slot>
                </DrawerViewport>
            </DrawerContent>
        </DrawerPortal>
    </DrawerRoot>
</template>
<style scoped>
@import '@css/components/drawer-component.css';
</style>
