<script setup lang="ts">
import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { cart, home, listCircle, restaurant } from '@/lib/icons';
</script>
<template>
    <ion-page>
        <ion-tabs>
            <ion-router-outlet></ion-router-outlet>
            <ion-tab-bar slot="bottom">
                <ion-tab-button tab="dashboard" href="/tabs/dashboard">
                    <i aria-hidden="true" :class="home"></i>
                    <ion-label>Vandaag</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="shopping" href="/tabs/shopping">
                    <i aria-hidden="true" :class="cart"></i>
                    <ion-label>Lijst</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="meals" href="/tabs/meals">
                    <i aria-hidden="true" :class="restaurant"></i>
                    <ion-label>Eten</ion-label>
                </ion-tab-button>
                <ion-tab-button tab="household" href="/tabs/household">
                    <i aria-hidden="true" :class="listCircle"></i>
                    <ion-label>Huis</ion-label>
                </ion-tab-button>
            </ion-tab-bar>
        </ion-tabs>
    </ion-page>
</template>
