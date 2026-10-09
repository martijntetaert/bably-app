<script setup lang="ts">
import PageHeaderComponent from '@/components/page-header-component.vue';

const props = defineProps<{
    openTaskCount: number | null;
}>();
</script>
<template>
    <section class="section-portal-household-tasks-tasks-header">
        <page-header-component>
            <template #title> Huis </template>
            <template #subtitle>
                <template v-if="props.openTaskCount !== null"> {{ props.openTaskCount }} taken open </template>
            </template>
        </page-header-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/tasks/sections/tasks-header.css';
</style>
