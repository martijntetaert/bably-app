<script setup lang="ts">
import { useCloseOnBack } from '@/composables/useCloseOnBack';
import { hideNativeTabBarWhile } from '@/lib/nativeTabBar';
import { Capacitor } from '@capacitor/core';
import { IonIcon, IonModal } from '@ionic/vue';
import { close as closeIcon } from 'ionicons/icons';
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

useCloseOnBack(open);
hideNativeTabBarWhile(open);

const descriptionAttributes = computed(() =>
    props.description ? {} : { 'aria-describedby': undefined },
);

const isSheet = Capacitor.getPlatform() === 'ios';

const sheetBreakpoints = [0, 1];
</script>
<template>
    <ion-modal
        v-if="isSheet"
        class="drawer-sheet"
        :is-open="open"
        :breakpoints="sheetBreakpoints"
        :initial-breakpoint="1"
        :focus-trap="false"
        :aria-label="title"
        @did-dismiss="open = false"
    >
        <div class="sheet">
            <div class="sheet-header">
                <div class="titles">
                    <h2 class="title">{{ title }}</h2>
                    <p v-if="description" class="description">{{ description }}</p>
                </div>
                <button type="button" class="close" aria-label="Sluiten" @click="open = false">
                    <ion-icon :icon="closeIcon" aria-hidden="true"></ion-icon>
                </button>
            </div>
            <slot></slot>
        </div>
    </ion-modal>
    <DrawerRoot v-else v-model:open="open">
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
