<script setup lang="ts">
import { useIonRouter } from '@ionic/vue';
import PageHeaderComponent from '@/components/page-header-component.vue';

defineProps<{
    subtitle: string;
}>();

const ionRouter = useIonRouter();

const back = (): void => {
    if (ionRouter.canGoBack()) {
        ionRouter.back();

        return;
    }

    ionRouter.navigate('/tabs/shopping', 'back', 'replace');
};
</script>
<template>
    <section class="section-portal-products-products-header">
        <a class="back" href="/tabs/shopping" @click.prevent="back()">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            <span>Terug</span>
        </a>
        <page-header-component>
            <template #title> Producten </template>
            <template #subtitle> {{ subtitle }} </template>
        </page-header-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/products/sections/products-header.css';
</style>
