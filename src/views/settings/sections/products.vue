<script setup lang="ts">
import { useIonRouter } from '@ionic/vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

const ionRouter = useIonRouter();
</script>
<template>
    <section class="section-portal-settings-products">
        <section-label-component class="label">Producten</section-label-component>
        <list-group-component>
            <list-row-component
                title="Al je producten"
                meta="Namen, categorieën, barcodes en samenvoegen"
                grouped
                clickable
                @click="ionRouter.push('/products')"
            >
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
        </list-group-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/products.css';
</style>
