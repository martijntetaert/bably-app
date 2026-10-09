<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui';
import { computed } from 'vue';
import { getInitials } from '@/composables/useInitials';

const props = withDefaults(
    defineProps<{
        name: string;
        photo?: string | null;
        pending?: boolean;
        size?: 'sm' | 'md' | 'lg';
    }>(),
    {
        photo: null,
        pending: false,
        size: 'md',
    },
);

const initial = computed(() => getInitials(props.name.split('@')[0]).charAt(0));
</script>
<template>
    <section
        class="component-avatar-component"
        :class="[
            `component-avatar-component-${size}`,
            { 'is-pending': pending },
        ]"
    >
        <AvatarRoot class="avatar-root" :title="name">
            <AvatarImage
                v-if="photo"
                class="avatar-image"
                :src="photo"
                :alt="name"
            />
            <AvatarFallback class="avatar-fallback">
                {{ initial }}
            </AvatarFallback>
        </AvatarRoot>
    </section>
</template>
<style scoped>
@import '@css/components/avatar-component.css';
</style>
