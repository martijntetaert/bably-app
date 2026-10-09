<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { IonButton, IonContent, IonHeader, IonModal, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { meals } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { RecipeInterface } from '@/interfaces/RecipeInterface';

const props = defineProps<{
    date: string | null;
    recipes: RecipeInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    planned: [];
    newRecipe: [];
}>();

const toast = useToast();
const search = ref('');
const isPlanning = ref(false);
const error = ref<string | null>(null);

const plain = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

const day = computed(() => (props.date ? DateTime.fromISO(props.date).setLocale('nl-BE').toFormat('cccc d MMMM') : ''));

const matches = computed(() => props.recipes.filter((recipe) => plain(recipe.name).includes(plain(search.value))));

watch(open, (isOpen) => {
    if (isOpen) {
        search.value = '';
        error.value = null;
    }
});

const plan = async (fields: { recipeIdentifier?: string; name?: string }): Promise<void> => {
    if (props.date === null || isPlanning.value) {
        return;
    }

    isPlanning.value = true;
    error.value = null;

    try {
        await meals.plan({ eatenOn: props.date, ...fields });
        open.value = false;
        emit('planned');
    } catch (failure) {
        if (failure instanceof ApiError && failure.status === 422) {
            error.value = failure.firstError('name') ?? failure.firstError('recipeIdentifier') ?? failure.firstError('eatenOn') ?? failure.message;
        } else {
            await toast.failure(failure);
        }
    } finally {
        isPlanning.value = false;
    }
};

const planFirstMatch = (): void => {
    if (matches.value[0]) {
        void plan({ recipeIdentifier: matches.value[0].identifier });
    } else if (search.value.trim() !== '') {
        void plan({ name: search.value.trim() });
    }
};
</script>
<template>
    <ion-modal :is-open="open" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-title>Wat eten we?</ion-title>
            </ion-toolbar>
            <ion-toolbar>
                <ion-searchbar
                    v-model="search"
                    placeholder="Zoek een recept of typ een gerecht…"
                    aria-label="Recept zoeken"
                    :debounce="0"
                    enterkeyhint="go"
                    @keydown.enter.prevent="planFirstMatch()"
                />
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="day">{{ day }}</p>
            <p v-if="error" class="error">{{ error }}</p>
            <ul class="recipes">
                <li v-for="recipe in matches" :key="recipe.identifier">
                    <button type="button" :disabled="isPlanning" @click="plan({ recipeIdentifier: recipe.identifier })">
                        <img v-if="recipe.photoUrl" class="thumbnail" :src="recipe.photoUrl" alt="" loading="lazy" />
                        <span class="what">
                            <span class="name">{{ recipe.name }}</span>
                            <span class="meta">Basis {{ recipe.baseServings }} · {{ recipe.ingredients.length }} ingrediënten</span>
                        </span>
                        <span class="plan">Plan in</span>
                    </button>
                </li>
                <li v-if="search.trim() !== '' && matches.length === 0">
                    <button type="button" :disabled="isPlanning" @click="plan({ name: search.trim() })">
                        <span class="what">
                            <span class="name">‘{{ search.trim() }}’</span>
                            <span class="meta">Zonder recept, er komt niets op de lijst</span>
                        </span>
                        <span class="plan">Plan in</span>
                    </button>
                </li>
            </ul>
            <p v-if="recipes.length === 0" class="hint">Nog geen recepten. Maak er een, of typ hierboven een gerecht zonder recept.</p>
            <ion-button expand="block" fill="outline" @click="emit('newRecipe')">Nieuw recept</ion-button>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.day {
    margin: 0 0 0.75rem;
    color: var(--bably-muted-text);
    text-transform: capitalize;
}

.error {
    margin: 0 0 0.75rem;
    color: var(--ion-color-danger);
    font-size: 0.85rem;
}

.recipes {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recipes button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    font: inherit;
    color: inherit;
    text-align: left;
    border-radius: var(--bably-radius-row);
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.recipes button:disabled {
    opacity: 0.6;
}

.thumbnail {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    object-fit: cover;
    flex-shrink: 0;
}

.what {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.name {
    font-weight: 600;
}

.meta {
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}

.plan {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ion-color-primary);
    flex-shrink: 0;
}

.hint {
    font-size: 0.85rem;
    color: var(--bably-muted-text);
}
</style>
