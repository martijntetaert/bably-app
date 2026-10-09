<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonButton, IonSkeletonText } from '@ionic/vue';
import { DateTime } from 'luxon';
import { chevronBack, chevronForward } from '@/lib/icons';
import { household } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { InsightsInterface } from '@/interfaces/HouseholdOverviewInterface';
import AvatarComponent from '@/components/avatar-component.vue';

const toast = useToast();

const result = ref<InsightsInterface | null>(null);
const isLoading = ref(false);

const shown = computed(() => (result.value ? DateTime.fromFormat(result.value.month, 'yyyy-MM') : DateTime.now().startOf('month')));
const title = computed(() => shown.value.setLocale('nl-BE').toFormat('LLLL yyyy'));
const isCurrentMonth = computed(() => result.value === null || result.value.month === result.value.currentMonth);
const insights = computed(() => result.value?.insights ?? null);
const mostTasks = computed(() => Math.max(1, ...(insights.value?.tasks.map((member) => member.count) ?? [])));

const load = async (month?: string): Promise<void> => {
    isLoading.value = true;

    try {
        result.value = await household.insights(month);
    } catch (error) {
        await toast.failure(error);
    } finally {
        isLoading.value = false;
    }
};

const step = (offset: number): Promise<void> => load(shown.value.plus({ months: offset }).toFormat('yyyy-MM'));

const refresh = (): Promise<void> => load(result.value?.month);

const times = (count: number): string => `${count} keer`;

defineExpose({ refresh });

void load();
</script>
<template>
    <div class="insights">
        <div class="period">
            <ion-button fill="clear" aria-label="Vorige maand" :disabled="isLoading" @click="step(-1)">
                <i slot="icon-only" :class="chevronBack" aria-hidden="true"></i>
            </ion-button>
            <span class="month display">{{ title }}</span>
            <ion-button fill="clear" aria-label="Volgende maand" :disabled="isLoading || isCurrentMonth" @click="step(1)">
                <i slot="icon-only" :class="chevronForward" aria-hidden="true"></i>
            </ion-button>
        </div>

        <div v-if="insights === null" class="cards">
            <ion-skeleton-text v-for="card in 4" :key="card" :animated="true" class="card skeleton"></ion-skeleton-text>
        </div>

        <div v-else class="cards" :class="{ 'is-loading': isLoading }">
            <section class="card">
                <h2 class="label">Taken afgewerkt</h2>
                <ul class="bars">
                    <li v-for="member in insights.tasks" :key="member.identifier">
                        <avatar-component :name="member.firstname" :photo="member.photoUrl" size="sm"></avatar-component>
                        <span class="who">{{ member.displayName }}</span>
                        <span class="bar">
                            <span class="fill" :style="{ width: `${(member.count / mostTasks) * 100}%` }"></span>
                        </span>
                        <span class="count">{{ member.count }}</span>
                    </li>
                </ul>
            </section>

            <section class="card">
                <h2 class="label">Gekookt</h2>
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
            </section>

            <section class="card">
                <h2 class="label">Vaakst gekocht</h2>
                <ol v-if="insights.products.length > 0" class="ranking">
                    <li v-for="product in insights.products" :key="product.name">
                        <span>{{ product.name }}</span>
                        <span class="count">{{ times(product.count) }}</span>
                    </li>
                </ol>
                <p v-else class="empty">Wat je in de winkel afvinkt, komt hier.</p>
            </section>

            <section class="card">
                <h2 class="label">Boodschappen</h2>
                <p class="figure">
                    {{ insights.shopping.trips }}
                    <span>keer winkelen</span>
                </p>
                <p v-if="insights.shopping.store" class="empty">Meestal in {{ insights.shopping.store }}</p>
            </section>
        </div>
    </div>
</template>
<style scoped>
.insights {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.period {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.month {
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: capitalize;
}

.cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: opacity 0.2s;
}

.cards.is-loading {
    opacity: 0.5;
}

.card {
    margin: 0;
    padding: 1rem 1.125rem;
    border: 1px solid var(--bably-border);
    border-radius: var(--bably-radius-card);
    background: var(--bably-card);
}

.card.skeleton {
    height: 7rem;
}

.label {
    margin: 0 0 0.75rem;
    color: var(--bably-muted-text);
    font-family: var(--ion-font-family);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.bars,
.ranking {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.bars li {
    display: grid;
    grid-template-columns: auto minmax(0, 6rem) 1fr auto;
    align-items: center;
    gap: 0.625rem;
}

.who {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bar {
    height: 0.5rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--bably-muted);
}

.fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--bably-home);
}

.count {
    color: var(--bably-muted-text);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
}

.ranking {
    counter-reset: rank;
}

.ranking li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.ranking li > span:first-child::before {
    counter-increment: rank;
    content: counter(rank) '. ';
    color: var(--bably-muted-text);
}

.figure {
    margin: 0 0 0.5rem;
    font-family: var(--bably-font-display);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.1;
}

.figure span {
    color: var(--bably-muted-text);
    font-family: var(--ion-font-family);
    font-size: 1rem;
    font-weight: 500;
}

.empty {
    margin: 0;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}
</style>
