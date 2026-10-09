<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import ListGroupComponent from '@/components/list-group-component.vue';
import ListRowComponent from '@/components/list-row-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';

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
    <section class="section-portal-settings-about">
        <section-label-component class="label">Over Bably</section-label-component>
        <list-group-component>
            <list-row-component title="Privacybeleid" grouped clickable @click="openPrivacy()">
                <template #leading>
                    <span class="badge">
                        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
                    </span>
                </template>
                <template #trailing>
                    <i class="fa-solid fa-arrow-up-right-from-square chevron" aria-hidden="true"></i>
                </template>
            </list-row-component>
            <list-row-component v-if="version" title="Versie" grouped>
                <template #trailing>
                    <span class="version">{{ version }}</span>
                </template>
            </list-row-component>
        </list-group-component>
    </section>
</template>
<style scoped>
/* The web portal has no about section, so its styles follow the neighbouring settings sections. */
.section-portal-settings-about {
    .badge {
        @apply bg-muted text-secondary-foreground flex size-8.5 items-center justify-center rounded-[0.6875rem];
    }

    .chevron {
        @apply text-faint text-xs;
    }

    .version {
        @apply text-muted-foreground text-[0.8125rem];
    }
}
</style>
