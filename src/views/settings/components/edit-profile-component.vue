<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    actionSheetController,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
} from '@ionic/vue';
import { Camera, MediaResult, MediaTypeSelection } from '@capacitor/camera';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useConfirm } from '@/composables/useConfirm';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import AvatarComponent from '@/components/avatar-component.vue';
import { squarePhoto } from '@/views/settings/square-photo';

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();
const confirm = useConfirm();

const photoSize = 512;

const firstname = ref('');
const lastname = ref('');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);
const isProcessingPhoto = ref(false);
const photoError = ref('');

const user = computed(() => session.user.value);

const fill = (): void => {
    firstname.value = user.value?.firstname ?? '';
    lastname.value = user.value?.lastname ?? '';
    errors.value = {};
    photoError.value = '';
};

const save = async (): Promise<void> => {
    busy.value = true;
    errors.value = {};

    try {
        await profileApi.update(firstname.value.trim(), lastname.value.trim());
        await session.refreshProfile();
        open.value = false;
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        busy.value = false;
    }
};

const pickSource = async (): Promise<'camera' | 'gallery' | null> => {
    const sheet = await actionSheetController.create({
        header: 'Profielfoto',
        buttons: [
            { text: 'Foto nemen', data: 'camera' },
            { text: 'Foto kiezen', data: 'gallery' },
            { text: 'Annuleren', role: 'cancel' },
        ],
    });
    await sheet.present();

    const { data } = await sheet.onDidDismiss<'camera' | 'gallery'>();

    return data ?? null;
};

const capture = async (source: 'camera' | 'gallery'): Promise<MediaResult | null> => {
    try {
        if (source === 'camera') {
            return await Camera.takePhoto({ quality: 90, correctOrientation: true });
        }

        const { results } = await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, quality: 90 });

        return results[0] ?? null;
    } catch {
        return null;
    }
};

const choosePhoto = async (): Promise<void> => {
    const source = await pickSource();

    if (source === null) {
        return;
    }

    const photo = await capture(source);

    if (photo?.webPath === undefined) {
        return;
    }

    photoError.value = '';
    isProcessingPhoto.value = true;

    try {
        const original = await (await fetch(photo.webPath)).blob();
        await profileApi.updatePhoto(await squarePhoto(original, photoSize));
        await session.refreshProfile();
    } catch (error) {
        if (error instanceof ApiError) {
            photoError.value = error.firstError('photo') ?? error.message;
        } else {
            photoError.value = 'Die foto kan Bably niet openen. Probeer een andere.';
        }
    } finally {
        isProcessingPhoto.value = false;
    }
};

const removePhoto = async (): Promise<void> => {
    if (!(await confirm('Foto weghalen?', 'Je foto verdwijnt; de anderen zien weer je initiaal.', 'Weghalen'))) {
        return;
    }

    try {
        await profileApi.deletePhoto();
        await session.refreshProfile();
    } catch (error) {
        await toast.failure(error);
    }
};
</script>
<template>
    <ion-modal :is-open="open" @will-present="fill()" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>Jouw profiel</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p class="description">De anderen zien je voornaam en je foto.</p>
            <div v-if="user" class="photo">
                <avatar-component :name="user.firstname" :photo="user.photoUrl" size="lg"></avatar-component>
                <div class="photo-actions">
                    <ion-button fill="outline" size="small" :disabled="isProcessingPhoto" @click="choosePhoto()">
                        <ion-spinner v-if="isProcessingPhoto" name="crescent"></ion-spinner>
                        <span v-else>{{ user.photoUrl ? 'Andere foto kiezen' : 'Foto kiezen' }}</span>
                    </ion-button>
                    <ion-button v-if="user.photoUrl" fill="clear" size="small" color="danger" @click="removePhoto()">
                        Foto weghalen
                    </ion-button>
                </div>
            </div>
            <p v-if="photoError" class="error">{{ photoError }}</p>

            <form @submit.prevent="save()">
                <ion-input
                    v-model="firstname"
                    label="Voornaam"
                    label-placement="stacked"
                    fill="outline"
                    autocomplete="given-name"
                    autocapitalize="words"
                    :class="{ 'ion-invalid ion-touched': errors.firstname }"
                    :error-text="errors.firstname?.[0]"
                ></ion-input>
                <ion-input
                    v-model="lastname"
                    label="Achternaam"
                    label-placement="stacked"
                    fill="outline"
                    autocomplete="family-name"
                    autocapitalize="words"
                    :class="{ 'ion-invalid ion-touched': errors.lastname }"
                    :error-text="errors.lastname?.[0]"
                ></ion-input>
                <ion-button
                    type="submit"
                    expand="block"
                    :disabled="busy || firstname.trim() === '' || lastname.trim() === ''"
                >
                    <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                    <span v-else>Bewaren</span>
                </ion-button>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.description {
    margin: 0 0 1.25rem;
    color: var(--bably-muted-text);
}

.photo {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
}

.photo-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.error {
    margin: -0.5rem 0 1rem;
    color: var(--ion-color-danger);
    font-size: 0.875rem;
}

form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>
