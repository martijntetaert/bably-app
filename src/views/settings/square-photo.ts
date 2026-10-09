/**
 * The centre square of the photo at `size` pixels, so a portrait or landscape shot works as
 * a round avatar; a phone photo of several megabytes shrinks to a small jpeg.
 */
export const squarePhoto = async (source: Blob, size: number): Promise<Blob> => {
    const image = await createImageBitmap(source);
    const side = Math.min(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas
        .getContext('2d')
        ?.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));

    if (blob === null) {
        throw new Error('canvas');
    }

    return blob;
};
