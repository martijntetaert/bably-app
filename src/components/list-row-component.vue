<script setup lang="ts">
import { computed, ref, useSlots, type FunctionalComponent } from 'vue';
import { Capacitor } from '@capacitor/core';
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/vue';
import { SwipeActionInterface } from '@/interfaces/SwipeActionInterface';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        title?: string;
        meta?: string;
        grouped?: boolean;
        clickable?: boolean;
        swipeActions?: SwipeActionInterface[];
        leadingSwipeAction?: SwipeActionInterface;
    }>(),
    {
        grouped: false,
        clickable: false,
        swipeActions: () => [],
        leadingSwipeAction: undefined,
    },
);

const slots = useSlots();

/**
 * Rows only slide on an iPhone, where swiping a row is how Mail and Reminders work; Android
 * keeps the buttons in the row and the exact markup it had.
 */
const isSwipeable = computed(
    () =>
        Capacitor.getPlatform() === 'ios' &&
        (props.swipeActions.length > 0 || props.leadingSwipeAction !== undefined),
);

const PassThrough: FunctionalComponent = (_, { slots: passed }) => passed.default?.();

const sliding = ref<{ $el: HTMLIonItemSlidingElement } | null>(null);
let isSlidOpen = false;

const close = (): void => {
    isSlidOpen = false;
    void sliding.value?.$el.close();
};

const run = (action: SwipeActionInterface): void => {
    close();
    action.run();
};

const trackOpening = (event: CustomEvent<{ amount: number }>): void => {
    isSlidOpen = event.detail.amount !== 0;
};

// A tap on a row that is slid open only closes it, as on iOS; it must not tick or open it.
const closeInsteadOfTap = (event: MouseEvent): void => {
    if (isSlidOpen) {
        event.stopPropagation();
        event.preventDefault();
        close();
    }
};

const slidingAttributes = computed(() =>
    isSwipeable.value ? { class: 'swipe-row', onIonDrag: trackOpening, onClickCapture: closeInsteadOfTap } : {},
);

const itemAttributes = computed(() => (isSwipeable.value ? { lines: 'none', class: 'swipe-item' } : {}));
</script>
<template>
    <component :is="isSwipeable ? IonItemSliding : PassThrough" ref="sliding" v-bind="slidingAttributes">
        <ion-item-options
            v-if="isSwipeable && leadingSwipeAction"
            side="start"
            @ion-swipe="run(leadingSwipeAction)"
        >
            <ion-item-option
                expandable
                :class="`swipe-action tone-${leadingSwipeAction.tone}`"
                @click="run(leadingSwipeAction)"
            >
                {{ leadingSwipeAction.label }}
            </ion-item-option>
        </ion-item-options>
        <component :is="isSwipeable ? IonItem : PassThrough" v-bind="itemAttributes">
            <section
                v-bind="$attrs"
                class="component-list-row-component"
                :class="{ 'is-grouped': grouped, 'is-clickable': clickable }"
            >
                <div v-if="slots.leading" class="leading">
                    <slot name="leading"></slot>
                </div>
                <div class="body">
                    <div class="title">
                        <slot name="title">{{ title }}</slot>
                    </div>
                    <div v-if="slots.meta || meta" class="meta">
                        <slot name="meta">{{ meta }}</slot>
                    </div>
                </div>
                <div v-if="slots.trailing" class="trailing">
                    <slot name="trailing"></slot>
                </div>
            </section>
        </component>
        <ion-item-options
            v-if="isSwipeable && swipeActions.length > 0"
            side="end"
            @ion-swipe="run(swipeActions[swipeActions.length - 1])"
        >
            <ion-item-option
                v-for="(action, index) in swipeActions"
                :key="action.label"
                :expandable="index === swipeActions.length - 1"
                :class="`swipe-action tone-${action.tone}`"
                @click="run(action)"
            >
                {{ action.label }}
            </ion-item-option>
        </ion-item-options>
    </component>
</template>
<style scoped>
@import '@css/components/list-row-component.css';
</style>
