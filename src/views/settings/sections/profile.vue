<script setup lang="ts">
import { ref } from 'vue';
import { useIonRouter } from '@ionic/vue';
import { Camera, MediaResult, MediaTypeSelection } from '@capacitor/camera';
import { profile as profileApi } from '@/api/bably';
import { ApiError } from '@/api/client';
import { usePush } from '@/composables/usePush';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import AvatarComponent from '@/components/avatar-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { UserInterface } from '@/interfaces/UserInterface';
import ChangeEmail from '@/views/settings/sections/change-email.vue';
import ChangePassword from '@/views/settings/sections/change-password.vue';
import DeleteAccount from '@/views/settings/sections/delete-account.vue';
import { squarePhoto } from '@/views/settings/square-photo';

type PhotoSource = 'camera' | 'gallery';

const props = defineProps<{
    profile: UserInterface;
    isLastMember: boolean;
}>();

const session = useSession();
const push = usePush();
const toast = useToast();
const ionRouter = useIonRouter();

const photoSize = 512;

const isOpen = ref(false);
const isChangingPassword = ref(false);
const isChangingEmail = ref(false);
const isDeletingAccount = ref(false);
const isConfirmingRemoval = ref(false);
const isProcessingPhoto = ref(false);
const isRemovingPhoto = ref(false);
const photoError = ref('');

const firstname = ref('');
const lastname = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);

const openProfile = (): void => {
    firstname.value = props.profile.firstname;
    lastname.value = props.profile.lastname;
    errors.value = {};
    photoError.value = '';
    isOpen.value = true;
};

const save = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};

    try {
        await profileApi.update(firstname.value.trim(), lastname.value.trim());
        await session.refreshProfile();
        isOpen.value = false;
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            toast.failure(error);
        }
    } finally {
        processing.value = false;
    }
};

const capture = async (source: PhotoSource): Promise<MediaResult | null> => {
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

// A phone photo is several megabytes; a centred square of 512px is all an avatar needs.
const uploadPhoto = async (source: PhotoSource): Promise<void> => {
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
        photoError.value =
            error instanceof ApiError
                ? error.firstError('photo') ?? 'Die foto lukte niet.'
                : 'Die foto kan Bably niet openen. Probeer een andere.';
    } finally {
        isProcessingPhoto.value = false;
    }
};

const removePhoto = async (): Promise<void> => {
    isRemovingPhoto.value = true;

    try {
        await profileApi.deletePhoto();
        await session.refreshProfile();
        isConfirmingRemoval.value = false;
    } catch (error) {
        toast.failure(error);
    } finally {
        isRemovingPhoto.value = false;
    }
};

const signOut = async (): Promise<void> => {
    await push.forget();
    await session.signOut();
    ionRouter.navigate('/login', 'root', 'replace');
};
</script>
<template>
    <section class="section-portal-settings-profile">
        <section-label-component class="label">Jij</section-label-component>
        <list-group-component>
            <list-row-component :title="profile.name" :meta="profile.email" grouped clickable @click="openProfile()">
                <template #leading>
                    <avatar-component :name="profile.firstname" :photo="profile.photoUrl"></avatar-component>
                </template>
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component
                title="E-mailadres wijzigen"
                :meta="profile.pendingEmail ? `Wacht op bevestiging van ${profile.pendingEmail}` : undefined"
                grouped
                clickable
                @click="isChangingEmail = true"
            >
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component title="Wachtwoord wijzigen" grouped clickable @click="isChangingPassword = true">
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component grouped clickable @click="signOut()">
                <template #title>
                    <span class="sign-out">Afmelden</span>
                </template>
                <template #trailing>
                    <i class="fa-solid fa-arrow-right-from-bracket chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component grouped clickable @click="isDeletingAccount = true">
                <template #title>
                    <span class="delete-account">Account verwijderen</span>
                </template>
            </list-row-component>
        </list-group-component>

        <drawer-component
            v-model:open="isOpen"
            title="Jouw profiel"
            description="De anderen zien je voornaam en je foto."
        >
            <form-component class="form" @submit="save()">
                <div class="photo">
                    <avatar-component :name="profile.firstname" :photo="profile.photoUrl" size="lg"></avatar-component>
                    <div class="photo-actions">
                        <button
                            type="button"
                            class="choose"
                            :disabled="isProcessingPhoto"
                            @click="uploadPhoto('gallery')"
                        >
                            {{
                                isProcessingPhoto
                                    ? 'Foto bewaren…'
                                    : profile.photoUrl
                                    ? 'Andere foto kiezen'
                                    : 'Foto kiezen'
                            }}
                        </button>
                        <button v-if="!isProcessingPhoto" type="button" class="choose" @click="uploadPhoto('camera')">
                            Foto nemen
                        </button>
                        <button
                            v-if="profile.photoUrl"
                            type="button"
                            class="remove"
                            @click="isConfirmingRemoval = true"
                        >
                            Foto weghalen
                        </button>
                    </div>
                </div>
                <p v-if="photoError" class="error">{{ photoError }}</p>

                <div class="field">
                    <section-label-component>Voornaam</section-label-component>
                    <input-component v-model="firstname" name="firstname" autocomplete="given-name" required />
                    <p v-if="errors.firstname" class="error">
                        {{ errors.firstname[0] }}
                    </p>
                </div>
                <div class="field">
                    <section-label-component>Achternaam</section-label-component>
                    <input-component v-model="lastname" name="lastname" autocomplete="family-name" required />
                    <p v-if="errors.lastname" class="error">
                        {{ errors.lastname[0] }}
                    </p>
                </div>

                <div class="actions">
                    <button-component
                        type="submit"
                        :disabled="processing || firstname.trim() === '' || lastname.trim() === ''"
                    >
                        Bewaren
                    </button-component>
                    <button-component variant="ghost" @click="isOpen = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>

        <change-email v-model:open="isChangingEmail" :email="profile.email"></change-email>
        <change-password v-model:open="isChangingPassword"></change-password>
        <delete-account v-model:open="isDeletingAccount" :is-last-member="isLastMember"></delete-account>

        <confirm-dialog-component
            v-model:open="isConfirmingRemoval"
            title="Foto weghalen?"
            description="Je foto verdwijnt; de anderen zien weer je initiaal."
            confirm-label="Weghalen"
            :processing="isRemovingPhoto"
            @confirm="removePhoto()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/profile.css';
</style>
