<script setup lang="ts">
import { ref } from 'vue';
import PageHeaderComponent from '@/components/page-header-component.vue';
import HouseholdName from '@/views/household/users/sections/household-name.vue';

const props = defineProps<{
    name: string | null;
    memberCount: number;
}>();

const emit = defineEmits<{
    renamed: [];
}>();

const isRenaming = ref(false);
</script>
<template>
    <section class="section-portal-household-users-users-header">
        <page-header-component>
            <template #title> Huis </template>
            <template #subtitle>
                <template v-if="props.name !== null">
                    <button
                        type="button"
                        class="rename"
                        aria-label="Naam van het huishouden wijzigen"
                        @click="isRenaming = true"
                    >
                        {{ props.name }}
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                    · {{ props.memberCount }}
                    {{ props.memberCount === 1 ? 'lid' : 'leden' }}
                </template>
            </template>
        </page-header-component>
        <household-name
            v-if="props.name !== null"
            v-model:open="isRenaming"
            :name="props.name"
            @saved="emit('renamed')"
        ></household-name>
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/users/sections/users-header.css';
</style>
