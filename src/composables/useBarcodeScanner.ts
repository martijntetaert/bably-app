import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useToast } from '@/composables/useToast';

const PRODUCT_FORMATS = [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE];

const isScanning = ref(false);

const isCancelled = (error: unknown): boolean => error instanceof Error && error.message.includes('canceled');

/**
 * Android scans through the Google Barcode Scanner module of Play Services, which needs no
 * camera permission but is downloaded the first time.
 */
async function isAndroidModuleReady(info: (message: string) => void): Promise<boolean> {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

    if (available) {
        return true;
    }

    await BarcodeScanner.installGoogleBarcodeScannerModule();
    info('Bably installeert de scanner. Probeer het zo meteen opnieuw.');

    return false;
}

async function mayUseCamera(): Promise<boolean> {
    let { camera } = await BarcodeScanner.checkPermissions();

    if (camera === 'prompt' || camera === 'prompt-with-rationale') {
        camera = (await BarcodeScanner.requestPermissions()).camera;
    }

    return camera === 'granted' || camera === 'limited';
}

export function useBarcodeScanner() {
    const toast = useToast();
    const isAvailable = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BarcodeScanner');

    /**
     * The scanned code, or null when nothing was scanned: cancelled, no camera access or no
     * scanner on this device. Whatever went wrong is told here, so callers only stop.
     */
    const scan = async (): Promise<string | null> => {
        if (isScanning.value) {
            return null;
        }

        if (!isAvailable) {
            toast.info('Scannen kan op dit toestel niet. Typ het product in.');

            return null;
        }

        isScanning.value = true;

        try {
            if (Capacitor.getPlatform() === 'android') {
                if (!(await isAndroidModuleReady(toast.info))) {
                    return null;
                }
            } else if (!(await mayUseCamera())) {
                toast.info('Bably mag de camera niet gebruiken. Zet de toegang aan in de instellingen om te scannen.');

                return null;
            }

            const { barcodes } = await BarcodeScanner.scan({ formats: PRODUCT_FORMATS, autoZoom: true });

            return barcodes[0]?.rawValue ?? null;
        } catch (error) {
            if (!isCancelled(error)) {
                toast.info('Scannen lukte niet. Probeer het opnieuw of typ het product in.');
            }

            return null;
        } finally {
            isScanning.value = false;
        }
    };

    return { scan, isAvailable, isScanning };
}
