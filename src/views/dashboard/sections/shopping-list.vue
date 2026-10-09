<script setup lang="ts">
import PortletComponent from '@/components/portlet-component.vue';

const props = defineProps<{
    count: number;
}>();
</script>
<template>
    <section class="section-portal-dashboard-shopping-list">
        <router-link to="/tabs/shopping">
            <portlet-component>
                <template #content>
                    <div class="total">{{ props.count }}</div>
                    <div class="title">op de lijst</div>
                    <div class="subtitle">voor je volgende rit</div>
                </template>
            </portlet-component>
        </router-link>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/shopping-list.css';
</style>
