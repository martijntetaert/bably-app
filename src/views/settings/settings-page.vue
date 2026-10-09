<script setup lang="ts">
import { ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { stores as storesApi } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import PortalPageComponent from '@/components/portal-page-component.vue';
import { StoreInterface } from '@/interfaces/StoreInterface';
import SettingsHeader from '@/views/settings/sections/settings-header.vue';
import Integrations from '@/views/settings/sections/integrations.vue';
import Stores from '@/views/settings/sections/stores.vue';
import Notifications from '@/views/settings/sections/notifications.vue';
import Profile from '@/views/settings/sections/profile.vue';
import About from '@/views/settings/sections/about.vue';

const session = useSession();
const toast = useToast();

const storeList = ref<StoreInterface[]>([]);

const loadStores = async (): Promise<void> => {
    storeList.value = await storesApi.list();
};

const reload = async (): Promise<void> => {
    try {
        await Promise.all([session.refreshProfile(), loadStores()]);
    } catch (error) {
        toast.failure(error);
    }
};

const reloadStores = async (): Promise<void> => {
    try {
        await loadStores();
    } catch (error) {
        toast.failure(error);
    }
};

onIonViewWillEnter(reload);
</script>
<template>
    <portal-page-component :refresh="reload">
        <div id="page-portal-settings-overview">
            <settings-header></settings-header>
            <template v-if="session.profile.value">
                <profile
                    :profile="session.profile.value.user"
                    :is-last-member="session.profile.value.isLastMember"
                ></profile>
                <notifications :wants-task-reminder="session.profile.value.wantsTaskReminder"></notifications>
                <integrations :calendar-url="session.profile.value.calendarUrl"></integrations>
                <stores :stores="storeList" @changed="reloadStores()"></stores>
                <about></about>
            </template>
            <template v-else>
                <div class="skeleton" aria-busy="true"></div>
                <div class="skeleton" aria-busy="true"></div>
                <div class="skeleton" aria-busy="true"></div>
            </template>
        </div>
    </portal-page-component>
</template>
<style scoped>
@import '@css/pages/portal/settings/overview.css';

.skeleton {
    @apply rounded-card bg-muted h-28 animate-pulse;
}
</style>
