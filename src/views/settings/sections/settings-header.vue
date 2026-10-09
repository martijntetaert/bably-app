<script setup lang="ts">
import { useIonRouter } from '@ionic/vue';
import PageHeaderComponent from '@/components/page-header-component.vue';

const ionRouter = useIonRouter();

const back = (): void => {
    if (ionRouter.canGoBack()) {
        ionRouter.back();

        return;
    }

    ionRouter.navigate('/tabs/dashboard', 'back', 'replace');
};
</script>
<template>
    <section class="section-portal-settings-settings-header">
        <a class="back" href="/tabs/dashboard" @click.prevent="back()">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            <span>Vandaag</span>
        </a>
        <page-header-component>
            <template #title> Instellingen </template>
            <template #subtitle> Jij, meldingen, agenda en winkels </template>
        </page-header-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/settings-header.css';
</style>
