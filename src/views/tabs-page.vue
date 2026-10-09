<script setup lang="ts">
import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
</script>
<template>
    <ion-page>
        <ion-tabs>
            <ion-router-outlet></ion-router-outlet>
            <ion-tab-bar slot="bottom">
                <ion-tab-button tab="dashboard" href="/tabs/dashboard">
                    <i class="fa-solid fa-house" aria-hidden="true"></i>
                    <ion-label>Vandaag</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="shopping" href="/tabs/shopping">
                    <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                    <ion-label>Lijst</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="meals" href="/tabs/meals">
                    <i class="fa-solid fa-utensils" aria-hidden="true"></i>
                    <ion-label>Eten</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="household" href="/tabs/household">
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                    <ion-label>Huis</ion-label>
                </ion-tab-button>
            </ion-tab-bar>
        </ion-tabs>
    </ion-page>
</template>
