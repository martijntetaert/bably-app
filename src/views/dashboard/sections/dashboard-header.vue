<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { useDateTime } from '@/composables/useDateTime';
import AvatarComponent from '@/components/avatar-component.vue';
import PageHeaderComponent from '@/components/page-header-component.vue';
import { UserInterface } from '@/interfaces/UserInterface';

const props = defineProps<{
    members: UserInterface[];
}>();

const { now } = useDateTime();

const currentMoment = computed(() => now());

const currentDate = computed(() => currentMoment.value.toLocaleString(DateTime.DATE_HUGE));

const greeting = computed(() => {
    const hour = currentMoment.value.hour;

    if (hour < 6) {
        return 'Goeienacht';
    }

    if (hour < 12) {
        return 'Goeiemorgen';
    }

    if (hour < 18) {
        return 'Goeiemiddag';
    }

    return 'Goeieavond';
});
</script>
<template>
    <section class="section-portal-dashboard-dashboard-header">
        <page-header-component>
            <template #title>
                {{ greeting }}
            </template>
            <template #subtitle>
                {{ currentDate }}
            </template>
            <template #right>
                <router-link class="avatars" to="/settings" aria-label="Instellingen">
                    <avatar-component
                        v-for="member in props.members"
                        :key="member.identifier"
                        :name="member.firstname"
                        :photo="member.photoUrl"
                        size="sm"
                    ></avatar-component>
                    <span class="settings">
                        <i class="fa-solid fa-gear" aria-hidden="true"></i>
                    </span>
                </router-link>
            </template>
        </page-header-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/dashboard-header.css';
</style>
