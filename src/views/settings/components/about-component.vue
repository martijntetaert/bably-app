<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/vue';
import { openOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const privacyUrl = 'https://bably.be/privacy';

const version = ref<string | null>(null);

onMounted(async () => {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    const info = await App.getInfo().catch(() => null);
    version.value = info === null ? null : `${info.version} (${info.build})`;
});

const openPrivacy = async (): Promise<void> => {
    await Browser.open({ url: privacyUrl });
};
</script>
<template>
    <section class="about-component">
        <ion-list inset>
            <ion-list-header>
                <ion-label>Over Bably</ion-label>
            </ion-list-header>
            <ion-item button :lines="version ? undefined : 'none'" @click="openPrivacy()">
                <ion-icon slot="start" :icon="shieldCheckmarkOutline" aria-hidden="true"></ion-icon>
                <ion-label>Privacybeleid</ion-label>
                <ion-icon slot="end" class="external" :icon="openOutline" aria-hidden="true"></ion-icon>
            </ion-item>
            <ion-item v-if="version" lines="none">
                <ion-label>Versie</ion-label>
                <ion-note slot="end">{{ version }}</ion-note>
            </ion-item>
        </ion-list>
    </section>
</template>
<style scoped>
ion-icon[slot='start'] {
    color: var(--ion-color-primary);
}

.external {
    color: var(--bably-muted-text);
    font-size: 1rem;
}
</style>
