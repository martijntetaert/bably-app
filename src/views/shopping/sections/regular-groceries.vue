<script setup lang="ts">
import SectionLabelComponent from '@/components/section-label-component.vue';
import { shopping } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { RegularGroceryInterface } from '@/interfaces/RegularGroceryInterface';
import { addedSummary } from '@/views/shopping/composables/useShoppingMessages';
import { ShoppingPart } from '@/views/shopping/composables/useShoppingData';

defineProps<{
    suggestions: RegularGroceryInterface[];
}>();

const emit = defineEmits<{
    changed: [parts: ShoppingPart[]];
}>();

const only: ShoppingPart[] = ['list', 'suggestions', 'products'];

const toast = useToast();

const rhythm = (days: number): string => (days === 1 ? 'elke dag' : days === 7 ? 'elke week' : `om de ${days} dagen`);

const run = async (request: () => Promise<unknown>): Promise<void> => {
    try {
        await request();
    } catch (error) {
        toast.failure(error);
    } finally {
        emit('changed', only);
    }
};

const add = (suggestion: RegularGroceryInterface): Promise<void> =>
    run(async () => {
        const result = await shopping.add({
            productIdentifier: suggestion.identifier,
        });
        const message = addedSummary(result);

        if (message !== null) {
            toast.info(message);
        }
    });

// Putting a suggestion off removes nothing, so it needs no confirmation.
const snooze = (suggestion: RegularGroceryInterface): Promise<void> =>
    run(() => shopping.snooze(suggestion.identifier));
</script>
<template>
    <section class="section-portal-shopping-regular-groceries">
        <section-label-component class="label">Misschien nodig</section-label-component>
        <ul>
            <li v-for="suggestion in suggestions" :key="suggestion.identifier">
                <button type="button" class="add" @click="add(suggestion)">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    <span class="name">{{ suggestion.name }}</span>
                    <span class="rhythm">{{ rhythm(suggestion.intervalDays) }}</span>
                </button>
                <button
                    type="button"
                    class="snooze"
                    :aria-label="`${suggestion.name} nu niet`"
                    @click="snooze(suggestion)"
                >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </li>
        </ul>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/shopping/sections/regular-groceries.css';
</style>
