<script setup lang="ts">
import { computed, ref } from 'vue';
import { DateTime } from 'luxon';
import AvatarComponent from '@/components/avatar-component.vue';
import PageHeaderComponent from '@/components/page-header-component.vue';
import PortletComponent from '@/components/portlet-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import HouseholdNavigation from '@/views/household/sections/household-navigation.vue';
import { household } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { now } from '@/composables/useDateTime';
import { InsightsInterface } from '@/interfaces/HouseholdOverviewInterface';

const toast = useToast();

const result = ref<InsightsInterface | null>(null);
const month = ref(now().toFormat('yyyy-MM'));

const insights = computed(() => result.value?.insights);

const shown = computed(() => DateTime.fromFormat(month.value, 'yyyy-MM'));

const title = computed(() => shown.value.setLocale('nl-BE').toFormat('LLLL yyyy'));

const load = async (): Promise<void> => {
    try {
        result.value = await household.insights(month.value);
    } catch (error) {
        toast.failure(error);
    }
};

const step = (offset: number): void => {
    month.value = shown.value.plus({ months: offset }).toFormat('yyyy-MM');
    void load();
};

const isCurrentMonth = computed(() => month.value === (result.value?.currentMonth ?? now().toFormat('yyyy-MM')));

const mostTasks = computed(() => Math.max(1, ...(insights.value?.tasks.map((member) => member.count) ?? [])));

const times = (count: number): string => `${count} keer`;

defineExpose({ refresh: load });

void load();
</script>
<template>
    <div id="page-portal-household-insights-overview">
        <page-header-component>
            <template #title> Huis </template>
            <template #subtitle>
                <span class="period">
                    <button type="button" class="step" aria-label="Vorige maand" @click="step(-1)">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <span class="month">{{ title }}</span>
                    <button
                        v-if="!isCurrentMonth"
                        type="button"
                        class="step"
                        aria-label="Volgende maand"
                        @click="step(1)"
                    >
                        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                    </button>
                </span>
            </template>
        </page-header-component>
        <household-navigation></household-navigation>

        <div v-if="!insights" class="skeleton">
            <div v-for="card in 4" :key="card" class="card"></div>
        </div>

        <div v-else class="cards">
            <portlet-component>
                <template #title>
                    <section-label-component>Taken afgewerkt</section-label-component>
                </template>
                <template #content>
                    <ul class="bars">
                        <li v-for="member in insights.tasks" :key="member.identifier">
                            <avatar-component :name="member.firstname" :photo="member.photoUrl" size="sm"></avatar-component>
                            <span class="who">{{ member.displayName }}</span>
                            <span class="bar">
                                <span
                                    class="fill"
                                    :style="{
                                        width: `${(member.count / mostTasks) * 100}%`,
                                    }"
                                ></span>
                            </span>
                            <span class="count">{{ member.count }}</span>
                        </li>
                    </ul>
                </template>
            </portlet-component>

            <portlet-component>
                <template #title>
                    <section-label-component>Gekookt</section-label-component>
                </template>
                <template #content>
                    <p class="figure">
                        {{ insights.cooking.days }}
                        <span>{{ insights.cooking.days === 1 ? 'dag' : 'dagen' }}</span>
                    </p>
                    <ol v-if="insights.cooking.recipes.length > 0" class="ranking">
                        <li v-for="recipe in insights.cooking.recipes" :key="recipe.name">
                            <span>{{ recipe.name }}</span>
                            <span class="count">{{ times(recipe.count) }}</span>
                        </li>
                    </ol>
                    <p v-else class="empty">Nog niets gepland deze maand.</p>
                </template>
            </portlet-component>

            <portlet-component>
                <template #title>
                    <section-label-component>Vaakst gekocht</section-label-component>
                </template>
                <template #content>
                    <ol v-if="insights.products.length > 0" class="ranking">
                        <li v-for="product in insights.products" :key="product.name">
                            <span>{{ product.name }}</span>
                            <span class="count">{{ times(product.count) }}</span>
                        </li>
                    </ol>
                    <p v-else class="empty">Wat je in de winkel afvinkt, komt hier.</p>
                </template>
            </portlet-component>

            <portlet-component>
                <template #title>
                    <section-label-component>Boodschappen</section-label-component>
                </template>
                <template #content>
                    <p class="figure">
                        {{ insights.shopping.trips }}
                        <span>keer winkelen</span>
                    </p>
                    <p v-if="insights.shopping.store" class="empty">Meestal in {{ insights.shopping.store }}</p>
                </template>
            </portlet-component>
        </div>
    </div>
</template>
<style scoped>
@import '@css/pages/portal/household/insights/overview.css';
</style>
