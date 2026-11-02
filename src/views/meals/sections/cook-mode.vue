<script setup lang="ts">
import { useCloseOnBack } from '@/composables/useCloseOnBack';
import { hideNativeTabBarWhile } from '@/lib/nativeTabBar';
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
} from 'reka-ui';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import ButtonComponent from '@/components/button-component.vue';
import CheckboxComponent from '@/components/checkbox-component.vue';
import { useKeepAwake } from '@/composables/useKeepAwake';
import { CookingInterface } from '@/interfaces/CookingInterface';
import { useCookingTimers } from '@/views/meals/composables/useCookingTimers';
import { findDurations, formatRemaining } from '@/views/meals/lib/cooking-timers';

const props = defineProps<{
    cooking: CookingInterface | null;
}>();

const open = defineModel<boolean>('open', { required: true });

useCloseOnBack(open);
hideNativeTabBarWhile(open);

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
    void nextTick(() =>
        stepCard.value?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
        })
    );
};

const go = (by: number): void => {
    show(Math.min(steps.value.length - 1, Math.max(0, current.value + by)));
};

const startTimer = (label: string, seconds: number): void => {
    void start(`Stap ${current.value + 1} · ${label}`, seconds, props.cooking?.name ?? 'Bably');
};
</script>
<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <DialogOverlay class="cook-mode-overlay" />
            <DialogContent v-if="cooking" class="section-portal-meals-cook-mode">
                <header class="top">
                    <div class="titles">
                        <DialogTitle class="title">{{ cooking.name }}</DialogTitle>
                        <DialogDescription class="description">
                            {{ cooking.servings }}
                            {{ cooking.servings === 1 ? 'portie' : 'porties' }}
                            · je scherm blijft aan
                        </DialogDescription>
                    </div>
                    <DialogClose class="close" aria-label="Kookmodus sluiten">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </DialogClose>
                </header>

                <div class="body">
                    <img v-if="cooking.photoUrl" class="photo" :src="cooking.photoUrl" alt="" />

                    <section
                        v-if="cooking.ingredients.length > 0"
                        class="ingredients"
                        aria-labelledby="cook-ingredients"
                    >
                        <h3 id="cook-ingredients">
                            Ingrediënten
                            <span>{{ ready.size }} van {{ cooking.ingredients.length }} klaar</span>
                        </h3>
                        <ul>
                            <li
                                v-for="ingredient in cooking.ingredients"
                                :key="ingredient.name"
                                :class="{
                                    'is-ready': ready.has(ingredient.name),
                                }"
                            >
                                <checkbox-component
                                    :model-value="ready.has(ingredient.name)"
                                    @update:model-value="toggleReady(ingredient.name)"
                                >
                                    <span class="name">{{ ingredient.name }}</span>
                                    <span class="amount">{{ ingredient.amount || 'naar smaak' }}</span>
                                </checkbox-component>
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
                                    <i class="fa-solid fa-stopwatch" aria-hidden="true"></i>
                                    {{ duration.label }} starten
                                </button>
                            </div>
                        </div>
                        <ol class="overview">
                            <li
                                v-for="(step, index) in steps"
                                :key="index"
                                :class="{
                                    'is-current': index === current,
                                    'is-done': index < current,
                                }"
                            >
                                <button type="button" @click="show(index)">
                                    <span class="number">{{ index + 1 }}</span>
                                    <span class="text">{{ step }}</span>
                                </button>
                            </li>
                        </ol>
                    </section>
                    <p v-else class="no-steps">
                        Dit recept heeft nog geen bereiding. Voeg stappen toe via Recept aanpassen.
                    </p>
                </div>

                <footer class="bottom">
                    <div v-if="timers.length > 0" class="timers" role="status">
                        <div v-for="timer in timers" :key="timer.id" class="timer" :class="{ 'is-done': timer.isDone }">
                            <i
                                :class="timer.isDone ? 'fa-solid fa-bell' : 'fa-solid fa-stopwatch'"
                                aria-hidden="true"
                            ></i>
                            <span class="label">{{ timer.label }}</span>
                            <span class="remaining">{{
                                timer.isDone ? 'Klaar!' : formatRemaining(timer.remaining)
                            }}</span>
                            <button
                                type="button"
                                :aria-label="timer.isDone ? `${timer.label} wegtikken` : `${timer.label} stoppen`"
                                @click="stop(timer.id)"
                            >
                                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div v-if="steps.length > 0" class="navigation">
                        <button-component variant="secondary" :disabled="current === 0" @click="go(-1)">
                            Vorige
                        </button-component>
                        <button-component :disabled="current === steps.length - 1" @click="go(1)">
                            Volgende stap
                        </button-component>
                    </div>
                </footer>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/cook-mode.css';
</style>
