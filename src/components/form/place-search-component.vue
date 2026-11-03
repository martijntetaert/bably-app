<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { stores } from '@/api/bably';
import { PlaceSuggestionInterface } from '@/interfaces/PlaceSuggestionInterface';

const props = defineProps<{
    sessionToken: string;
    near?: { latitude: number; longitude: number } | null;
    name?: string;
    placeholder?: string;
    required?: boolean;
}>();

const emit = defineEmits<{
    picked: [place: PlaceSuggestionInterface];
}>();

const text = defineModel<string>({ required: true });
const place = defineModel<PlaceSuggestionInterface | null>('place', { required: true });

const MIN_LENGTH = 2;
const DEBOUNCE = 300;

const suggestions = ref<PlaceSuggestionInterface[]>([]);
const isFocused = ref(false);
let timer: number | undefined;
let latestSearch = 0;

const showsSuggestions = computed(() => isFocused.value && suggestions.value.length > 0);

const search = async (): Promise<void> => {
    const searchNumber = ++latestSearch;
    const typed = text.value.trim();

    if (typed.length < MIN_LENGTH) {
        suggestions.value = [];

        return;
    }

    try {
        const found = await stores.places(typed, props.sessionToken, props.near ?? null);

        if (searchNumber === latestSearch) {
            suggestions.value = found;
        }
    } catch {
        suggestions.value = [];
    }
};

// Only what the user types searches; a name filled in by the app does not.
const typed = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void search(), DEBOUNCE);
};

const pick = (suggestion: PlaceSuggestionInterface): void => {
    window.clearTimeout(timer);
    latestSearch++;
    place.value = suggestion;
    text.value = suggestion.name;
    suggestions.value = [];
    emit('picked', suggestion);
};

onBeforeUnmount(() => window.clearTimeout(timer));
</script>
<template>
    <section class="component-place-search-component">
        <input
            v-model="text"
            type="text"
            :name="name"
            :placeholder="placeholder"
            :required="required"
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="showsSuggestions"
            @input="typed()"
            @focus="isFocused = true"
            @blur="isFocused = false"
        />
        <ul v-if="showsSuggestions" class="suggestions" role="listbox" aria-label="Winkels op Google">
            <li
                v-for="suggestion in suggestions"
                :key="suggestion.googlePlaceId"
                role="option"
                :aria-selected="false"
                @mousedown.prevent="pick(suggestion)"
            >
                <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                <span class="what">
                    <span class="name">{{ suggestion.name }}</span>
                    <span v-if="suggestion.address" class="address">{{ suggestion.address }}</span>
                </span>
            </li>
        </ul>
        <div v-if="place" class="linked">
            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            <span class="what">
                <span class="name">{{ place.name }}</span>
                <span v-if="place.address" class="address">{{ place.address }}</span>
            </span>
            <button type="button" class="unlink" :aria-label="`${place.name} ontkoppelen`" @click="place = null">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/form/place-search-component.css';
</style>
