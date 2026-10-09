<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { cart, home, listCircle, restaurant } from 'ionicons/icons';
</script>
<template>
    <ion-page>
        <ion-tabs>
            <ion-router-outlet></ion-router-outlet>
            <ion-tab-bar slot="bottom">
                <ion-tab-button tab="dashboard" href="/tabs/dashboard">
                    <ion-icon aria-hidden="true" :icon="home" />
                    <ion-label>Vandaag</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="shopping" href="/tabs/shopping">
                    <ion-icon aria-hidden="true" :icon="cart" />
                    <ion-label>Lijst</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="meals" href="/tabs/meals">
                    <ion-icon aria-hidden="true" :icon="restaurant" />
                    <ion-label>Eten</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="household" href="/tabs/household">
                    <ion-icon aria-hidden="true" :icon="listCircle" />
                    <ion-label>Huis</ion-label>
                </ion-tab-button>
            </ion-tab-bar>
        </ion-tabs>
    </ion-page>
</template>
