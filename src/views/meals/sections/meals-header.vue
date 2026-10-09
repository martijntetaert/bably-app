<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import PageHeaderComponent from '@/components/page-header-component.vue';

const props = defineProps<{
    subtitle: string;
    weekStart: string;
    today: string;
    showsWeek: boolean;
}>();

const emit = defineEmits<{
    showWeek: [week: string | undefined];
}>();

const weekOf = (offset: number): string | undefined =>
    DateTime.fromISO(props.weekStart).plus({ weeks: offset }).toISODate() ?? undefined;

const isThisWeek = computed(() => DateTime.fromISO(props.today).startOf('week').toISODate() === props.weekStart);
</script>
<template>
    <section class="section-portal-meals-meals-header">
        <page-header-component>
            <template #title> Eten </template>
            <template #subtitle>
                {{ props.subtitle }}
            </template>
            <template v-if="showsWeek" #right>
                <nav class="weeks" aria-label="Week kiezen">
                    <a href="#" aria-label="Vorige week" @click.prevent="emit('showWeek', weekOf(-1))">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    </a>
                    <a v-if="!isThisWeek" href="#" class="this-week" @click.prevent="emit('showWeek', undefined)">
                        Deze week
                    </a>
                    <a href="#" aria-label="Volgende week" @click.prevent="emit('showWeek', weekOf(1))">
                        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                    </a>
                </nav>
            </template>
        </page-header-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/meals-header.css';
</style>
