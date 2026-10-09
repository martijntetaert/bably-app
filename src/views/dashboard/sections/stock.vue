<script setup lang="ts">
import PortletComponent from '@/components/portlet-component.vue';

defineProps<{
    count: number;
}>();
</script>
<template>
    <section class="section-portal-dashboard-stock">
        <router-link to="/tabs/shopping">
            <portlet-component>
                <template #content>
                    <div class="total" :class="{ 'is-calm': count === 0 }">
                        {{ count }}
                    </div>
                    <div class="title">bijna op</div>
                    <div class="subtitle">in je voorraad</div>
                </template>
            </portlet-component>
        </router-link>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/stock.css';
</style>
