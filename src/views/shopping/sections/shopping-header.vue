<script setup lang="ts">
import { computed } from 'vue';
import PageHeaderComponent from '@/components/page-header-component.vue';

const props = defineProps<{
    subtitle: string;
    progress: { done: number; total: number } | null;
}>();

const percentage = computed(() => {
    if (!props.progress || props.progress.total === 0) {
        return '0%';
    }

    return `${Math.round((props.progress.done / props.progress.total) * 100)}%`;
});
</script>
<template>
    <section class="section-portal-shopping-shopping-header">
        <page-header-component>
            <template #title> Boodschappen </template>
            <template #subtitle>
                {{ props.subtitle }}
            </template>
            <template #right>
                <span v-if="props.progress" class="progress-label">
                    {{ props.progress.done }}/{{ props.progress.total }} in de kar
                </span>
                <router-link v-else class="products" to="/products" aria-label="Producten">
                    <i class="fa-solid fa-tags" aria-hidden="true"></i>
                </router-link>
            </template>
        </page-header-component>
        <div
            v-if="props.progress"
            class="bar"
            role="progressbar"
            :aria-valuenow="props.progress.done"
            :aria-valuemax="props.progress.total"
        >
            <div class="fill" :style="{ width: percentage }"></div>
        </div>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/shopping-header.css';
</style>
