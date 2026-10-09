<script setup lang="ts">
import { ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { add as addIcon, close } from 'ionicons/icons';
import { shopping } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import { RegularGroceryInterface } from '@/interfaces/RegularGroceryInterface';
import { addedSummary } from '@/views/shopping/composables/useShoppingMessages';

defineProps<{
    suggestions: RegularGroceryInterface[];
}>();

const emit = defineEmits<{
    changed: [];
}>();

const toast = useToast();
const busy = ref<string | null>(null);

const rhythm = (days: number): string => (days === 1 ? 'elke dag' : days === 7 ? 'elke week' : `om de ${days} dagen`);

const run = async (suggestion: RegularGroceryInterface, request: () => Promise<unknown>): Promise<void> => {
    busy.value = suggestion.identifier;

    try {
        await request();
    } catch (error) {
        await toast.failure(error);
    } finally {
        busy.value = null;
        emit('changed');
    }
};

const add = (suggestion: RegularGroceryInterface): Promise<void> =>
    run(suggestion, async () => {
        const message = addedSummary(await shopping.add({ productIdentifier: suggestion.identifier }));

        if (message !== null) {
            await toast.info(message);
        }
    });

// Putting a suggestion off removes nothing, so it needs no confirmation.
const snooze = (suggestion: RegularGroceryInterface): Promise<void> => run(suggestion, () => shopping.snooze(suggestion.identifier));
</script>
<template>
    <section class="regular-groceries">
        <h2 class="label">Misschien nodig</h2>
        <ul>
            <li v-for="suggestion in suggestions" :key="suggestion.identifier" :class="{ 'is-busy': busy === suggestion.identifier }">
                <button type="button" class="add" :disabled="busy !== null" @click="add(suggestion)">
                    <ion-icon :icon="addIcon" aria-hidden="true"></ion-icon>
                    <span class="name">{{ suggestion.name }}</span>
                    <span class="rhythm">{{ rhythm(suggestion.intervalDays) }}</span>
                </button>
                <button type="button" class="snooze" :disabled="busy !== null" :aria-label="`${suggestion.name} nu niet`" @click="snooze(suggestion)">
                    <ion-icon :icon="close" aria-hidden="true"></ion-icon>
                </button>
            </li>
        </ul>
    </section>
</template>
<style scoped>
.regular-groceries {
    margin-bottom: 0.75rem;
}

.label {
    margin: 0 0.375rem 0.5rem;
    color: var(--bably-muted-text);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

ul {
    display: flex;
    gap: 0.5rem;
    margin: 0 -1rem;
    padding: 0 1rem 0.25rem;
    overflow-x: auto;
    list-style: none;
    scrollbar-width: none;
}

li {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    border: 1px dashed var(--bably-border);
    border-radius: 999px;
    background: var(--bably-card);
    transition: opacity 0.15s;
}

li.is-busy {
    opacity: 0.5;
}

button {
    background: transparent;
    color: var(--ion-text-color);
}

.add {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    padding: 0.5rem 0.25rem 0.5rem 0.75rem;
    font-size: 0.875rem;
}

.add ion-icon {
    color: var(--bably-groceries);
}

.name {
    font-weight: 600;
}

.rhythm {
    color: var(--bably-muted-text);
    font-size: 0.75rem;
}

.snooze {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem 0.5rem 0.375rem;
    color: var(--bably-muted-text);
}
</style>
