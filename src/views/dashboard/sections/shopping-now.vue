<script setup lang="ts">
import { computed } from 'vue';
import { useSession } from '@/composables/useSession';
import { ShoppingTripInterface } from '@/interfaces/ShoppingTripInterface';

const props = defineProps<{
    trip: ShoppingTripInterface;
}>();

const session = useSession();

const isYou = computed(() => props.trip.startedBy?.identifier === session.user.value?.identifier);

const who = computed(() => (isYou.value ? 'Je bent' : `${props.trip.startedBy?.displayName ?? 'Iemand'} is`));
</script>
<template>
    <section class="section-portal-dashboard-shopping-now">
        <router-link to="/tabs/shopping">
            <span class="pin"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i></span>
            <span class="what">
                <span class="title">{{ who }} in de {{ trip.store.name }}</span>
                <span class="subtitle">{{
                    isYou ? 'Ga verder met je lijst' : 'Nog iets nodig? Zet het op de lijst.'
                }}</span>
            </span>
            <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
        </router-link>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/dashboard/sections/shopping-now.css';
</style>
