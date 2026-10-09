<script setup lang="ts">
import { computed } from 'vue';
import PortletComponent from '@/components/portlet-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

const props = defineProps<{
    steps: { invite: boolean; store: boolean; meal: boolean };
}>();

const emit = defineEmits<{
    dismiss: [];
}>();

const items = computed(() => [
    {
        key: 'invite',
        title: 'Nodig je huisgenoten uit',
        meta: 'Samen één lijst, één menu en de taken verdeeld',
        href: '/tabs/household?segment=members',
        done: props.steps.invite,
    },
    {
        key: 'store',
        title: 'Voeg je winkel toe',
        meta: 'Bably leert er je looproute',
        href: '/settings',
        done: props.steps.store,
    },
    {
        key: 'meal',
        title: 'Plan je eerste maaltijd',
        meta: 'De ingrediënten komen vanzelf op de lijst',
        href: '/tabs/meals',
        done: props.steps.meal,
    },
]);
</script>
<template>
    <section class="section-portal-dashboard-first-steps">
        <portlet-component>
            <template #title>
                <section-label-component>Zo begin je</section-label-component>
            </template>
            <template #actions>
                <button type="button" class="dismiss" @click="emit('dismiss')">Verbergen</button>
            </template>
            <template #content>
                <ol class="steps">
                    <li v-for="item in items" :key="item.key" :class="{ 'is-done': item.done }">
                        <router-link class="step" :to="item.href">
                            <span class="check">
                                <i v-if="item.done" class="fa-solid fa-check" aria-hidden="true"></i>
                            </span>
                            <span class="what">
                                <span class="title">{{ item.title }}</span>
                                <span class="meta">{{ item.meta }}</span>
                            </span>
                            <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                        </router-link>
                    </li>
                </ol>
            </template>
        </portlet-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/first-steps.css';
</style>
