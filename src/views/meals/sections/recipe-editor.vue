<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import DrawerComponent from '@/components/drawer-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import StepperComponent from '@/components/stepper-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { recipes } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { IngredientLineInterface } from '@/interfaces/IngredientLineInterface';
import { RecipeDraftInterface } from '@/interfaces/RecipeInterface';
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

const recipeForm = ref<{
    name: string;
    baseServings: number;
    sourceUrl: string | null;
    ingredients: IngredientLineInterface[];
    steps: string[];
    photo: Blob | null;
    importedPhotoUrl: string | null;
    removePhoto: boolean;
}>({
    name: '',
    baseServings: 2,
    sourceUrl: null,
    ingredients: [],
    steps: [],
    photo: null,
    importedPhotoUrl: null,
    removePhoto: false,
});

const errors = ref<Record<string, string>>({});
const isSaving = ref(false);

const isProcessingPhoto = ref(false);
const photoError = ref('');
const chosenPhotoUrl = ref<string | null>(null);

const photoPreview = computed(() => {
    if (chosenPhotoUrl.value) {
        return chosenPhotoUrl.value;
    }

    if (recipeForm.value.removePhoto) {
        return null;
    }

    return recipeForm.value.importedPhotoUrl ?? props.draft?.photoUrl ?? null;
});

const forgetChosenPhoto = (): void => {
    if (chosenPhotoUrl.value) {
        URL.revokeObjectURL(chosenPhotoUrl.value);
    }

    chosenPhotoUrl.value = null;
    recipeForm.value.photo = null;
};

onBeforeUnmount(forgetChosenPhoto);

const choosePhoto = async (): Promise<void> => {
    photoError.value = '';
    isProcessingPhoto.value = true;

    try {
        const photo = await pickPhoto(PHOTO_LONGEST_SIDE);

        if (photo === null) {
            return;
        }

        forgetChosenPhoto();
        recipeForm.value.photo = photo;
        recipeForm.value.removePhoto = false;
        chosenPhotoUrl.value = URL.createObjectURL(photo);
    } catch {
        photoError.value = 'Die foto kan Bably niet openen. Probeer een andere.';
    } finally {
        isProcessingPhoto.value = false;
    }
};

const removePhoto = (): void => {
    forgetChosenPhoto();
    recipeForm.value.importedPhotoUrl = null;
    recipeForm.value.removePhoto = true;
};

const newStep = ref('');

const addStep = (): void => {
    if (newStep.value.trim() === '') {
        return;
    }

    recipeForm.value.steps.push(newStep.value.trim());
    newStep.value = '';
};

const removeStep = (index: number): void => {
    recipeForm.value.steps.splice(index, 1);
};

const moveStep = (index: number, by: number): void => {
    const [step] = recipeForm.value.steps.splice(index, 1);
    recipeForm.value.steps.splice(index + by, 0, step);
};

const newName = ref('');
const newAmount = ref('');

// Nobody buys 57 pieces of butter: a bare number this large was meant as grams.
const looksLikeGrams = (amount: string): boolean => /^\d+$/.test(amount.trim()) && Number(amount) > 20;
const isConfirmingDelete = ref(false);
const isDeleting = ref(false);

watch(open, (isOpen) => {
    if (!isOpen || !props.draft) {
        return;
    }

    errors.value = {};
    recipeForm.value.name = props.draft.name;
    recipeForm.value.baseServings = props.draft.baseServings;
    recipeForm.value.sourceUrl = props.draft.sourceUrl;
    recipeForm.value.ingredients = props.draft.ingredients.map((ingredient) => ({ ...ingredient }));
    recipeForm.value.steps = [...props.draft.steps];
    recipeForm.value.removePhoto = false;
    // A photo that comes with an imported recipe still sits on the cooking site; Bably
    // copies it in when the recipe is saved.
    recipeForm.value.importedPhotoUrl = props.draft.identifier ? null : props.draft.photoUrl;
    forgetChosenPhoto();
    photoError.value = '';
    newName.value = '';
    newAmount.value = '';
    newStep.value = '';
});

const addIngredient = (): void => {
    if (newName.value.trim() === '') {
        return;
    }

    recipeForm.value.ingredients.push({
        name: newName.value.trim(),
        amount: newAmount.value.trim(),
    });
    newName.value = '';
    newAmount.value = '';
};

const removeIngredient = (index: number): void => {
    recipeForm.value.ingredients.splice(index, 1);
};

const save = async (): Promise<void> => {
    addIngredient();
    addStep();

    if (recipeForm.value.name.trim() === '' || isSaving.value) {
        return;
    }

    isSaving.value = true;
    errors.value = {};

    const form = recipeForm.value;
    const fields = {
        name: form.name.trim(),
        baseServings: form.baseServings,
        ingredients: form.ingredients.map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.amount || null,
        })),
        steps: form.steps,
        sourceUrl: form.sourceUrl,
        photo: form.photo,
        importedPhotoUrl: form.importedPhotoUrl,
        removePhoto: form.removePhoto,
    };

    try {
        const identifier = props.draft?.identifier;

        await (identifier ? recipes.update(identifier, fields) : recipes.create(fields));
        open.value = false;
        emit('saved');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.errors).map(([field, messages]) => [field, messages[0] ?? ''])
            );
        } else {
            toast.failure(error);
        }
    } finally {
        isSaving.value = false;
    }
};

const destroy = async (): Promise<void> => {
    if (!props.draft?.identifier) {
        return;
    }

    isDeleting.value = true;

    try {
        await recipes.remove(props.draft.identifier);
        isConfirmingDelete.value = false;
        open.value = false;
        emit('saved');
    } catch (error) {
        toast.failure(error);
    } finally {
        isDeleting.value = false;
    }
};
</script>
<template>
    <section class="section-portal-meals-recipe-editor">
        <drawer-component
            v-model:open="open"
            :title="draft?.identifier ? 'Recept aanpassen' : 'Nieuw recept'"
            :description="draft?.sourceUrl ? `Overgenomen van ${draft.sourceUrl}` : undefined"
        >
            <form-component class="form" @submit="save()">
                <div class="photo" :class="{ 'has-photo': photoPreview }">
                    <img v-if="photoPreview" :src="photoPreview" :alt="`Foto van ${recipeForm.name || 'het recept'}`" />
                    <div class="photo-actions">
                        <button type="button" class="photo-button" :disabled="isProcessingPhoto" @click="choosePhoto()">
                            <i class="fa-solid fa-camera" aria-hidden="true"></i>
                            {{ photoPreview ? 'Andere foto' : 'Foto toevoegen' }}
                        </button>
                        <button v-if="photoPreview" type="button" class="photo-button" @click="removePhoto()">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                            Foto weghalen
                        </button>
                    </div>
                </div>
                <p v-if="photoError || errors.photo" class="error">
                    {{ photoError || errors.photo }}
                </p>

                <input-component
                    v-model="recipeForm.name"
                    name="recipe"
                    placeholder="bv. Macaroni met hesp en kaas"
                    autocomplete="off"
                    required
                />
                <p v-if="errors.name" class="error">
                    {{ errors.name }}
                </p>

                <div class="servings">
                    <div class="what">
                        <span class="title">Basisporties</span>
                        <span class="meta">Hierop schaalt Bably alles</span>
                    </div>
                    <stepper-component
                        v-model="recipeForm.baseServings"
                        :min="1"
                        :max="24"
                        label="Basisporties"
                    ></stepper-component>
                </div>
                <p v-if="errors.baseServings" class="error">
                    {{ errors.baseServings }}
                </p>

                <div class="field">
                    <section-label-component>Ingrediënten</section-label-component>
                    <ul v-if="recipeForm.ingredients.length > 0" class="ingredients">
                        <li v-for="(ingredient, index) in recipeForm.ingredients" :key="index">
                            <input
                                v-model="ingredient.name"
                                class="name"
                                type="text"
                                :aria-label="`Ingrediënt ${index + 1}`"
                            />
                            <input
                                v-model="ingredient.amount"
                                class="amount"
                                type="text"
                                placeholder="naar smaak"
                                :aria-label="`Hoeveelheid van ${ingredient.name}`"
                            />
                            <button
                                type="button"
                                class="remove"
                                :aria-label="`${ingredient.name} weghalen`"
                                @click="removeIngredient(index)"
                            >
                                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        </li>
                    </ul>
                    <p
                        v-for="ingredient in recipeForm.ingredients.filter((candidate) =>
                            looksLikeGrams(candidate.amount)
                        )"
                        :key="`grams-${ingredient.name}`"
                        class="unit-hint"
                    >
                        <span>
                            {{ ingredient.name }}: bedoel je {{ ingredient.amount }} g? Zonder eenheid telt Bably stuks.
                        </span>
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
                        <button type="button" class="plus" aria-label="Ingrediënt toevoegen" @click="addIngredient()">
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                    <p v-if="Object.keys(errors).some((key) => key.startsWith('ingredients'))" class="error">
                        Elk ingrediënt heeft een naam nodig.
                    </p>
                </div>

                <div class="field">
                    <section-label-component>Bereiding</section-label-component>
                    <ol v-if="recipeForm.steps.length > 0" class="steps">
                        <li v-for="(step, index) in recipeForm.steps" :key="index">
                            <span class="number">{{ index + 1 }}</span>
                            <textarea
                                v-model="recipeForm.steps[index]"
                                rows="2"
                                :aria-label="`Stap ${index + 1}`"
                            ></textarea>
                            <div class="step-actions">
                                <button
                                    type="button"
                                    :disabled="index === 0"
                                    :aria-label="`Stap ${index + 1} naar boven`"
                                    @click="moveStep(index, -1)"
                                >
                                    <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    :disabled="index === recipeForm.steps.length - 1"
                                    :aria-label="`Stap ${index + 1} naar beneden`"
                                    @click="moveStep(index, 1)"
                                >
                                    <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="remove"
                                    :aria-label="`Stap ${index + 1} weghalen`"
                                    @click="removeStep(index)"
                                >
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        </li>
                    </ol>
                    <div class="add">
                        <textarea
                            v-model="newStep"
                            class="name"
                            rows="2"
                            :placeholder="`Stap ${recipeForm.steps.length + 1}, bv. Zet 20 minuten in de oven.`"
                            aria-label="Nieuwe stap"
                        ></textarea>
                        <button type="button" class="plus" aria-label="Stap toevoegen" @click="addStep()">
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <div class="actions">
                    <button-component type="submit" :disabled="isSaving || recipeForm.name.trim() === ''">
                        Recept bewaren
                    </button-component>
                    <button-component
                        v-if="draft?.identifier"
                        variant="secondary"
                        icon="fa-solid fa-fire-burner"
                        @click="emit('cook', draft.identifier)"
                    >
                        Koken
                    </button-component>
                    <button-component v-if="draft?.identifier" variant="danger" @click="isConfirmingDelete = true">
                        Recept verwijderen
                    </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>

        <confirm-dialog-component
            v-if="draft?.identifier"
            v-model:open="isConfirmingDelete"
            title="Recept verwijderen?"
            :description="`${draft.name} verdwijnt uit je recepten. Geplande maaltijden blijven op het menu, maar hun ingrediënten gaan van de lijst.`"
            :processing="isDeleting"
            @confirm="destroy()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/meals/sections/recipe-editor.css';
</style>
