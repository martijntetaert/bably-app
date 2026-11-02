<script setup lang="ts">
import { computed } from 'vue';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import { formatDate } from '@/composables/useDateTime';
import { usePlus } from '@/composables/usePlus';
import { PlusInterface } from '@/interfaces/PlusInterface';

const props = defineProps<{
    plus: PlusInterface;
}>();

const { showPaywall } = usePlus();

const status = computed(() => {
    const until = props.plus.endsAt === null ? '' : ` tot ${formatDate(props.plus.endsAt)}`;

    switch (props.plus.reason) {
        case 'trial':
            return `Gratis proberen${until}`;
        case 'granted':
            return 'Voor altijd, voor heel je huishouden';
        case 'play_store':
        case 'app_store':
        case 'test_store':
            return `Actief${until}`;
        default:
            return 'Route, voorraad, alle recepten en meer';
    }
});
</script>
<template>
    <section class="section-portal-settings-plus">
        <section-label-component class="label">Abonnement</section-label-component>
        <list-group-component>
            <list-row-component title="Bably Plus" :meta="status" grouped clickable @click="showPaywall()">
                <template #leading>
                    <span class="badge">
                        <i class="fa-solid fa-star" aria-hidden="true"></i>
                    </span>
                </template>
                <template #trailing>
                    <i class="fa-solid fa-chevron-right chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
        </list-group-component>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/settings/sections/plus.css';
</style>
