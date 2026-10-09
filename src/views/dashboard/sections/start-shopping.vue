<script setup lang="ts">
import { useIonRouter } from '@ionic/vue';
import ButtonComponent from '@/components/button-component.vue';

const ionRouter = useIonRouter();
</script>
<template>
    <section class="section-portal-dashboard-start-shopping">
        <button-component
            icon="fa-solid fa-cart-shopping"
            variant="soft"
            @click="ionRouter.push('/tabs/shopping?start=1')"
        >
            Ik begin met winkelen
        </button-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/start-shopping.css';
</style>
