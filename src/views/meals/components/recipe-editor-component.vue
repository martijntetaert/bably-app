<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSpinner, IonTextarea, IonTitle, IonToolbar } from '@ionic/vue';
import { add, arrowDown, arrowUp, camera, close, flame, trashOutline } from '@/lib/icons';
import { recipes } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { RecipeDraftInterface } from '@/interfaces/RecipeInterface';
import StepperComponent from '@/views/meals/components/stepper-component.vue';
import { pickPhoto } from '@/views/meals/lib/photo';

const props = defineProps<{
    draft: RecipeDraftInterface | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
    saved: [];
    cook: [identifier: string];
}>();

const PHOTO_LONGEST_SIDE = 1600;

const toast = useToast();
const confirm = useConfirm();

const name = ref('');
const baseServings = ref(2);
const sourceUrl = ref<string | null>(null);
const ingredients = ref<IngredientLineInterface[]>([]);
const steps = ref<string[]>([]);
const photo = ref<Blob | null>(null);
const importedPhotoUrl = ref<string | null>(null);
const shouldRemovePhoto = ref(false);
const errors = ref<Record<string, string[]>>({});
const isSaving = ref(false);
const isProcessingPhoto = ref(false);
const photoError = ref('');
const chosenPhotoUrl = ref<string | null>(null);
const newName = ref('');
const newAmount = ref('');
const newStep = ref('');

const firstError = (field: string): string | null => errors.value[field]?.[0] ?? null;

const hasIngredientError = computed(() => Object.keys(errors.value).some((key) => key.startsWith('ingredients')));

const photoPreview = computed(() => {
    if (chosenPhotoUrl.value) {
        return chosenPhotoUrl.value;
    }

    if (shouldRemovePhoto.value) {
        return null;
    }

    return importedPhotoUrl.value ?? props.draft?.photoUrl ?? null;
});

const forgetChosenPhoto = (): void => {
    if (chosenPhotoUrl.value) {
        URL.revokeObjectURL(chosenPhotoUrl.value);
    }

    chosenPhotoUrl.value = null;
    photo.value = null;
};

onBeforeUnmount(forgetChosenPhoto);

watch(open, (isOpen) => {
    if (!isOpen || !props.draft) {
        return;
    }

    errors.value = {};
    name.value = props.draft.name;
    baseServings.value = props.draft.baseServings;
    sourceUrl.value = props.draft.sourceUrl;
    ingredients.value = props.draft.ingredients.map((ingredient) => ({ ...ingredient }));
    steps.value = [...props.draft.steps];
    shouldRemovePhoto.value = false;
    // A photo that comes with an imported recipe still sits on the cooking site; Bably
    // copies it in when the recipe is saved.
    importedPhotoUrl.value = props.draft.identifier ? null : props.draft.photoUrl;
    forgetChosenPhoto();
    photoError.value = '';
    newName.value = '';
    newAmount.value = '';
    newStep.value = '';
});

const choosePhoto = async (): Promise<void> => {
    photoError.value = '';
    isProcessingPhoto.value = true;

    try {
        const chosen = await pickPhoto(PHOTO_LONGEST_SIDE);

        if (chosen === null) {
            return;
        }

        forgetChosenPhoto();
        photo.value = chosen;
        shouldRemovePhoto.value = false;
        chosenPhotoUrl.value = URL.createObjectURL(chosen);
    } catch {
        photoError.value = 'Die foto kan Bably niet openen. Probeer een andere.';
    } finally {
        isProcessingPhoto.value = false;
    }
};

const removePhoto = (): void => {
    forgetChosenPhoto();
    importedPhotoUrl.value = null;
    shouldRemovePhoto.value = true;
};

// Nobody buys 57 pieces of butter: a bare number this large was meant as grams.
const looksLikeGrams = (amount: string): boolean => /^\d+$/.test(amount.trim()) && Number(amount) > 20;

const gramHints = computed(() => ingredients.value.filter((ingredient) => looksLikeGrams(ingredient.amount)));

const addIngredient = (): void => {
    if (newName.value.trim() === '') {
        return;
    }

    ingredients.value.push({ name: newName.value.trim(), amount: newAmount.value.trim() });
    newName.value = '';
    newAmount.value = '';
};

const removeIngredient = (index: number): void => {
    ingredients.value.splice(index, 1);
};

const addStep = (): void => {
    if (newStep.value.trim() === '') {
        return;
    }

    steps.value.push(newStep.value.trim());
    newStep.value = '';
};

const removeStep = (index: number): void => {
    steps.value.splice(index, 1);
};

const moveStep = (index: number, by: number): void => {
    const [step] = steps.value.splice(index, 1);
    steps.value.splice(index + by, 0, step);
};

const save = async (): Promise<void> => {
    addIngredient();
    addStep();

    if (name.value.trim() === '' || isSaving.value) {
        return;
    }

    isSaving.value = true;
    errors.value = {};

    const fields = {
        name: name.value.trim(),
        baseServings: baseServings.value,
        ingredients: ingredients.value.map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount || null })),
        steps: steps.value,
        sourceUrl: sourceUrl.value,
        photo: photo.value,
        importedPhotoUrl: importedPhotoUrl.value,
        removePhoto: shouldRemovePhoto.value,
    };

    try {
        const identifier = props.draft?.identifier;
        await (identifier ? recipes.update(identifier, fields) : recipes.create(fields));
        open.value = false;
        emit('saved');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        isSaving.value = false;
    }
};

const destroy = async (): Promise<void> => {
    const draft = props.draft;

    if (!draft?.identifier) {
        return;
    }

    const isSure = await confirm(
        'Recept verwijderen?',
        `${draft.name} verdwijnt uit je recepten. Geplande maaltijden blijven op het menu, maar hun ingrediënten gaan van de lijst.`,
    );

    if (!isSure) {
        return;
    }

    try {
        await recipes.remove(draft.identifier);
        open.value = false;
        emit('saved');
    } catch (error) {
        await toast.failure(error);
    }
};
</script>
<template>
    <ion-modal :is-open="open" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>{{ draft?.identifier ? 'Recept aanpassen' : 'Nieuw recept' }}</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" :disabled="isSaving || name.trim() === ''" @click="save()">Bewaren</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <form class="form" @submit.prevent="save()">
                <p v-if="draft?.sourceUrl" class="source">Overgenomen van {{ draft.sourceUrl }}</p>

                <div class="photo" :class="{ 'has-photo': photoPreview }">
                    <img v-if="photoPreview" :src="photoPreview" :alt="`Foto van ${name || 'het recept'}`" />
                    <div class="photo-actions">
                        <button type="button" class="photo-button" :disabled="isProcessingPhoto" @click="choosePhoto()">
                            <ion-spinner v-if="isProcessingPhoto" name="dots" />
                            <i v-else :class="camera" aria-hidden="true"></i>
                            {{ photoPreview ? 'Andere foto' : 'Foto toevoegen' }}
                        </button>
                        <button v-if="photoPreview" type="button" class="photo-button" @click="removePhoto()">
                            <i :class="trashOutline" aria-hidden="true"></i>
                            Foto weghalen
                        </button>
                    </div>
                </div>
                <p v-if="photoError || firstError('photo')" class="error">{{ photoError || firstError('photo') }}</p>

                <ion-input
                    v-model="name"
                    label="Naam"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="bv. Macaroni met hesp en kaas"
                    autocomplete="off"
                    autocapitalize="sentences"
                    :class="{ 'ion-invalid ion-touched': firstError('name') }"
                    :error-text="firstError('name') ?? undefined"
                />

                <div class="row">
                    <div class="what">
                        <span class="title">Basisporties</span>
                        <span class="meta">Hierop schaalt Bably alles</span>
                    </div>
                    <stepper-component v-model="baseServings" :min="1" :max="24" label="Basisporties" />
                </div>
                <p v-if="firstError('baseServings')" class="error">{{ firstError('baseServings') }}</p>

                <div class="field">
                    <h3 class="label">Ingrediënten</h3>
                    <ul v-if="ingredients.length > 0" class="lines">
                        <li v-for="(ingredient, index) in ingredients" :key="index">
                            <input v-model="ingredient.name" class="name" type="text" :aria-label="`Ingrediënt ${index + 1}`" />
                            <input
                                v-model="ingredient.amount"
                                class="amount"
                                type="text"
                                placeholder="naar smaak"
                                :aria-label="`Hoeveelheid van ${ingredient.name}`"
                            />
                            <button type="button" class="icon" :aria-label="`${ingredient.name} weghalen`" @click="removeIngredient(index)">
                                <i :class="close" aria-hidden="true"></i>
                            </button>
                        </li>
                    </ul>
                    <p v-for="ingredient in gramHints" :key="`grams-${ingredient.name}`" class="unit-hint">
                        <span>{{ ingredient.name }}: bedoel je {{ ingredient.amount }} g? Zonder eenheid telt Bably stuks.</span>
                        <button type="button" @click="ingredient.amount += ' g'">Ja, gram</button>
                    </p>
                    <div class="add">
                        <input
                            v-model="newName"
                            class="name"
                            type="text"
                            placeholder="Ingrediënt"
                            aria-label="Nieuw ingrediënt"
                            enterkeyhint="next"
                            @keydown.enter.prevent="addIngredient()"
                        />
                        <input
                            v-model="newAmount"
                            class="amount"
                            type="text"
                            placeholder="250 g"
                            aria-label="Hoeveelheid van het nieuwe ingrediënt"
                            enterkeyhint="done"
                            @keydown.enter.prevent="addIngredient()"
                        />
                        <button type="button" class="icon is-add" aria-label="Ingrediënt toevoegen" @click="addIngredient()">
                            <i :class="add" aria-hidden="true"></i>
                        </button>
                    </div>
                    <p v-if="hasIngredientError" class="error">Elk ingrediënt heeft een naam nodig.</p>
                </div>

                <div class="field">
                    <h3 class="label">Bereiding</h3>
                    <ol v-if="steps.length > 0" class="steps">
                        <li v-for="(step, index) in steps" :key="index">
                            <span class="number">{{ index + 1 }}</span>
                            <ion-textarea v-model="steps[index]" class="text" :auto-grow="true" :rows="2" :aria-label="`Stap ${index + 1}`" />
                            <div class="step-actions">
                                <button type="button" class="icon" :disabled="index === 0" :aria-label="`Stap ${index + 1} naar boven`" @click="moveStep(index, -1)">
                                    <i :class="arrowUp" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="icon"
                                    :disabled="index === steps.length - 1"
                                    :aria-label="`Stap ${index + 1} naar beneden`"
                                    @click="moveStep(index, 1)"
                                >
                                    <i :class="arrowDown" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="icon" :aria-label="`Stap ${index + 1} weghalen`" @click="removeStep(index)">
                                    <i :class="close" aria-hidden="true"></i>
                                </button>
                            </div>
                        </li>
                    </ol>
                    <div class="add">
                        <ion-textarea
                            v-model="newStep"
                            class="text"
                            :auto-grow="true"
                            :rows="2"
                            :placeholder="`Stap ${steps.length + 1}, bv. Zet 20 minuten in de oven.`"
                            aria-label="Nieuwe stap"
                        />
                        <button type="button" class="icon is-add" aria-label="Stap toevoegen" @click="addStep()">
                            <i :class="add" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <div class="actions">
                    <ion-button type="submit" expand="block" :disabled="isSaving || name.trim() === ''">Recept bewaren</ion-button>
                    <ion-button v-if="draft?.identifier" expand="block" fill="outline" @click="emit('cook', draft.identifier)">
                        <i slot="start" :class="flame" aria-hidden="true"></i>
                        Koken
                    </ion-button>
                    <ion-button v-if="draft?.identifier" expand="block" fill="clear" color="danger" @click="destroy()">Recept verwijderen</ion-button>
                </div>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
}

.source {
    margin: 0;
    font-size: 0.8rem;
    color: var(--bably-muted-text);
    overflow-wrap: anywhere;
}

.photo {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 7rem;
    border-radius: var(--bably-radius-card);
    border: 1px dashed var(--bably-border);
    background: var(--bably-muted);
    overflow: hidden;
}

.photo.has-photo {
    border-style: solid;
    aspect-ratio: 16 / 10;
}

.photo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.photo-actions {
    position: relative;
    display: flex;
    gap: 0.5rem;
}

.has-photo .photo-actions {
    position: absolute;
    right: 0.6rem;
    bottom: 0.6rem;
}

button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
}

.photo-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.85rem;
    border-radius: 999px;
    background: var(--bably-card);
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 1px 4px rgb(0 0 0 / 15%);
}

.photo-button ion-spinner {
    width: 1rem;
    height: 1rem;
}

.error {
    margin: -0.5rem 0 0;
    color: var(--ion-color-danger);
    font-size: 0.85rem;
}

.field .error {
    margin: 0;
}

.row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-card);
    border: 1px solid var(--bably-border);
}

.what {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.title {
    font-weight: 600;
}

.meta {
    font-size: 0.8rem;
    color: var(--bably-muted-text);
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.label {
    margin: 0;
    font-family: var(--ion-font-family);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--bably-muted-text);
}

.lines,
.steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.lines li,
.add {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

input {
    min-width: 0;
    padding: 0.6rem 0.75rem;
    font: inherit;
    color: inherit;
    border-radius: 0.75rem;
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

input:focus {
    outline: 2px solid var(--ion-color-primary);
    outline-offset: -1px;
}

input.name {
    flex: 1;
}

input.amount {
    width: 6.5rem;
    flex-shrink: 0;
}

.icon {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: 999px;
    color: var(--bably-muted-text);
    font-size: 1.1rem;
}

.icon:disabled {
    opacity: 0.35;
}

.icon.is-add {
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
}

.unit-hint {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.75rem;
    background: var(--bably-accent-soft);
    font-size: 0.8rem;
}

.unit-hint span {
    flex: 1;
}

.unit-hint button {
    font-weight: 700;
    color: var(--ion-color-primary);
    white-space: nowrap;
}

.steps li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.number {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    margin-top: 0.5rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--bably-muted);
    font-size: 0.8rem;
    font-weight: 700;
}

ion-textarea.text {
    flex: 1;
    --padding-start: 0.75rem;
    --padding-end: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid var(--bably-border);
    background: var(--bably-card);
}

.step-actions {
    display: flex;
    flex-direction: column;
}

.step-actions .icon {
    width: 2rem;
    height: 1.9rem;
}

.add {
    align-items: flex-start;
}

.add .icon {
    margin-top: 0.15rem;
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
</style>
