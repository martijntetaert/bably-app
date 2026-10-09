import { alertController } from '@ionic/vue';

/**
 * Nothing is deleted on a single tap: every destructive action names its subject and asks
 * first.
 */
export function useConfirm() {
    return (header: string, message: string, confirmText = 'Verwijderen'): Promise<boolean> =>
        new Promise((resolve) => {
            alertController
                .create({
                    header,
                    message,
                    buttons: [
                        { text: 'Annuleren', role: 'cancel', handler: () => resolve(false) },
                        { text: confirmText, role: 'destructive', handler: () => resolve(true) },
                    ],
                })
                .then((alert) => {
                    alert.onDidDismiss().then(({ role }) => {
                        if (role === 'backdrop') {
                            resolve(false);
                        }
                    });
                    alert.present();
                });
        });
}
