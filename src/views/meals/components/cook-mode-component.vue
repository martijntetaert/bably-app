<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFooter, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue';
import { close, notifications, stopwatchOutline } from '@/lib/icons';
import { CookingInterface } from '@/interfaces/CookingInterface';
import { useCookingTimers } from '@/views/meals/composables/useCookingTimers';
import { useKeepAwake } from '@/composables/useKeepAwake';
import { findDurations, formatRemaining } from '@/views/meals/lib/cooking-timers';

const props = defineProps<{
    cooking: CookingInterface | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const current = ref(0);
const stepCard = useTemplateRef<HTMLElement>('stepCard');
const ready = ref<Set<string>>(new Set());

const { timers, start, stop } = useCookingTimers();

useKeepAwake(open);

watch(open, (isOpen) => {
    if (isOpen) {
        current.value = 0;
        ready.value = new Set();
    }
});

const steps = computed(() => props.cooking?.steps ?? []);
const durations = computed(() => findDurations(steps.value[current.value] ?? ''));

const toggleReady = (name: string): void => {
    const next = new Set(ready.value);

    if (next.has(name)) {
        next.delete(name);
    } else {
        next.add(name);
    }

    ready.value = next;
};

const show = (index: number): void => {
    current.value = index;
    void nextTick(() => stepCard.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
};

const go = (by: number): void => {
    show(Math.min(steps.value.length - 1, Math.max(0, current.value + by)));
};

const startTimer = (label: string, seconds: number): void => {
    void start(`Stap ${current.value + 1} · ${label}`, seconds, props.cooking?.name ?? 'Bably');
};
</script>
<template>
    <ion-modal :is-open="open" class="cook-mode" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-title>
                    {{ cooking?.name }}
                    <span v-if="cooking" class="subtitle">
                        {{ cooking.servings }} {{ cooking.servings === 1 ? 'portie' : 'porties' }} · je scherm blijft aan
                    </span>
                </ion-title>
                <ion-buttons slot="end">
                    <ion-button aria-label="Kookmodus sluiten" @click="open = false">
                        <i slot="icon-only" :class="close" aria-hidden="true"></i>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <div v-if="cooking" class="body">
                <img v-if="cooking.photoUrl" class="photo" :src="cooking.photoUrl" alt="" />

                <section v-if="cooking.ingredients.length > 0" class="ingredients" aria-labelledby="cook-ingredients">
                    <h3 id="cook-ingredients">
                        Ingrediënten
                        <span>{{ ready.size }} van {{ cooking.ingredients.length }} klaar</span>
                    </h3>
                    <ul>
                        <li v-for="ingredient in cooking.ingredients" :key="ingredient.name" :class="{ 'is-ready': ready.has(ingredient.name) }">
                            <ion-checkbox
                                justify="start"
                                label-placement="end"
                                :checked="ready.has(ingredient.name)"
                                @ion-change="toggleReady(ingredient.name)"
                            >
                                <span class="name">{{ ingredient.name }}</span>
                                <span class="amount">{{ ingredient.amount || 'naar smaak' }}</span>
                            </ion-checkbox>
                        </li>
                    </ul>
                </section>

                <section v-if="steps.length > 0" class="steps" aria-labelledby="cook-steps">
                    <h3 id="cook-steps">
                        Bereiding
                        <span>stap {{ current + 1 }} van {{ steps.length }}</span>
                    </h3>
                    <div ref="stepCard" class="step" aria-live="polite">
                        <p>{{ steps[current] }}</p>
                        <div v-if="durations.length > 0" class="chips">
                            <button
                                v-for="duration in durations"
                                :key="duration.seconds"
                                type="button"
                                class="chip"
                                @click="startTimer(duration.label, duration.seconds)"
                            >
                                <i :class="stopwatchOutline" aria-hidden="true"></i>
                                {{ duration.label }} starten
                            </button>
                        </div>
                    </div>
                    <ol class="overview">
                        <li v-for="(step, index) in steps" :key="index" :class="{ 'is-current': index === current, 'is-done': index < current }">
                            <button type="button" @click="show(index)">
                                <span class="number">{{ index + 1 }}</span>
                                <span class="text">{{ step }}</span>
                            </button>
                        </li>
                    </ol>
                </section>
                <p v-else class="no-steps">Dit recept heeft nog geen bereiding. Voeg stappen toe via Recept aanpassen.</p>
            </div>
        </ion-content>
        <ion-footer v-if="timers.length > 0 || steps.length > 0">
            <ion-toolbar>
                <div class="bottom">
                    <div v-if="timers.length > 0" class="timers" role="status">
                        <div v-for="timer in timers" :key="timer.id" class="timer" :class="{ 'is-done': timer.isDone }">
                            <i :class="timer.isDone ? notifications : stopwatchOutline" aria-hidden="true"></i>
                            <span class="label">{{ timer.label }}</span>
                            <span class="remaining">{{ timer.isDone ? 'Klaar!' : formatRemaining(timer.remaining) }}</span>
                            <button
                                type="button"
                                :aria-label="timer.isDone ? `${timer.label} wegtikken` : `${timer.label} stoppen`"
                                @click="stop(timer.id)"
                            >
                                <i :class="close" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div v-if="steps.length > 0" class="navigation">
                        <ion-button fill="outline" :disabled="current === 0" @click="go(-1)">Vorige</ion-button>
                        <ion-button :disabled="current === steps.length - 1" @click="go(1)">Volgende stap</ion-button>
                    </div>
                </div>
            </ion-toolbar>
        </ion-footer>
    </ion-modal>
</template>
<style scoped>
.subtitle {
    display: block;
    font-family: var(--ion-font-family);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--bably-muted-text);
}

.body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 1rem;
}

.photo {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: var(--bably-radius-card);
}

h3 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
}

h3 span {
    font-family: var(--ion-font-family);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--bably-muted-text);
}

.ingredients ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border-radius: var(--bably-radius-row);
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.ingredients li {
    padding: 0.6rem 1rem;
}

.ingredients li + li {
    border-top: 1px solid var(--bably-border);
}

.ingredients ion-checkbox {
    width: 100%;
}

.ingredients ion-checkbox::part(label) {
    display: flex;
    flex: 1;
    gap: 0.75rem;
    justify-content: space-between;
    white-space: normal;
}

.is-ready .name {
    text-decoration: line-through;
    color: var(--bably-muted-text);
}

.amount {
    color: var(--bably-muted-text);
    font-size: 0.9rem;
}

.step {
    padding: 1.1rem;
    border-radius: var(--bably-radius-card);
    background: var(--bably-accent-soft);
    scroll-margin: 1rem;
}

.step p {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.45;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.85rem;
}

button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    text-align: left;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
    font-weight: 600;
    font-size: 0.9rem;
}

.overview {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.overview button {
    display: flex;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.25rem;
}

.overview .number {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--bably-muted);
    font-size: 0.75rem;
    font-weight: 700;
}

.overview .text {
    font-size: 0.9rem;
    color: var(--bably-muted-text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.overview .is-current .number {
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
}

.overview .is-current .text {
    color: var(--ion-text-color);
    font-weight: 600;
}

.overview .is-done .text {
    text-decoration: line-through;
}

.no-steps {
    color: var(--bably-muted-text);
    text-align: center;
}

.bottom {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
}

.timers {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.timer {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.6rem 0.45rem 0.85rem;
    border-radius: 999px;
    background: var(--bably-muted);
}

.timer.is-done {
    background: var(--bably-meals);
    color: var(--bably-card);
    animation: pulse 1s ease-in-out infinite alternate;
}

.timer .label {
    flex: 1;
    font-size: 0.85rem;
}

.timer .remaining {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
}

.timer button {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    font-size: 1.1rem;
}

.navigation {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem;
}

.navigation ion-button {
    margin: 0;
}

@keyframes pulse {
    from {
        opacity: 1;
    }

    to {
        opacity: 0.75;
    }
}

@media (prefers-reduced-motion: reduce) {
    .timer.is-done {
        animation: none;
    }
}
</style>
