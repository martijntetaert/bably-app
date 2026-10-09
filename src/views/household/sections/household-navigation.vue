<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { HouseholdSegment, householdSegmentFrom } from '@/views/household/household-segment';

const items: { name: string; segment: HouseholdSegment }[] = [
    { name: 'Taken', segment: 'tasks' },
    { name: 'Huishouden', segment: 'members' },
    { name: 'Overzicht', segment: 'insights' },
];

const route = useRoute();

const active = computed(() => householdSegmentFrom(route.query.segment));

const isActive = (segment: HouseholdSegment): boolean => active.value === segment;
</script>
<template>
    <section class="section-portal-household-household-navigation">
        <!-- The web's tab-bar-navigation-component, inlined: here the tabs switch a segment instead of a page. -->
        <section class="component-tab-bar-navigation-component">
            <nav>
                <ul>
                    <li v-for="item in items" :key="item.name">
                        <router-link
                            :to="{ query: { segment: item.segment } }"
                            replace
                            :class="{ 'is-active': isActive(item.segment) }"
                            :aria-current="isActive(item.segment) ? 'page' : undefined"
                        >
                            {{ item.name }}
                        </router-link>
                    </li>
                </ul>
            </nav>
        </section>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/sections/household-navigation.css';
@import '@css/components/tab-bar-navigation-component.css';
</style>
