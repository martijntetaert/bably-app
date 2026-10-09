import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { actionSheetController } from '@ionic/vue';

type PhotoSource = 'camera' | 'gallery';

const askSource = async (): Promise<PhotoSource | null> => {
    const sheet = await actionSheetController.create({
        header: 'Foto van het recept',
        buttons: [
            { text: 'Foto maken', data: 'camera' },
            { text: "Kies uit je foto's", data: 'gallery' },
            { text: 'Annuleren', role: 'cancel' },
        ],
    });
    await sheet.present();

    const { data, role } = await sheet.onDidDismiss<PhotoSource>();

    return role === 'cancel' || role === 'backdrop' || data === undefined ? null : data;
};

const isCancelled = (error: unknown): boolean => error instanceof Error && /cancel/i.test(error.message);

/**
 * A phone photo of 12 megapixels shrunk to `longestSide`, enough for a full screen.
 */
export const resizePhoto = async (photo: Blob, longestSide: number): Promise<Blob> => {
    const image = await createImageBitmap(photo);
    const scale = Math.min(1, longestSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));

    if (!blob) {
        throw new Error('canvas');
    }

    return blob;
};

/**
 * Lets the cook take or choose a photo; null when they changed their mind on the way.
 */
export const pickPhoto = async (longestSide: number): Promise<Blob | null> => {
    const source = await askSource();

    if (source === null) {
        return null;
    }

    try {
        const result =
            source === 'camera'
                ? await Camera.takePhoto({ quality: 90, correctOrientation: true })
                : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, limit: 1 })).results[0];

        if (!result?.webPath) {
            return null;
        }

        const original = await (await fetch(result.webPath)).blob();

        return resizePhoto(original, longestSide);
    } catch (error) {
        if (isCancelled(error)) {
            return null;
        }

        throw error;
    }
};
