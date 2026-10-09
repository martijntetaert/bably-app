<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import AvatarComponent from '@/components/avatar-component.vue';
import { UserInterface } from '@/interfaces/UserInterface';

const props = defineProps<{
    members: UserInterface[];
    now: DateTime;
}>();

const currentDate = computed(() => props.now.toLocaleString(DateTime.DATE_HUGE));

const greeting = computed(() => {
    const hour = props.now.hour;

    if (hour < 6) {
        return 'Goeienacht';
    }

    if (hour < 12) {
        return 'Goeiemorgen';
    }

    if (hour < 18) {
        return 'Goeiemiddag';
    }

    return 'Goeieavond';
});
</script>
<template>
    <header class="dashboard-header-component">
        <div class="what">
            <h1>{{ greeting }}</h1>
            <p class="date">{{ currentDate }}</p>
        </div>
        <div v-if="props.members.length > 0" class="avatars">
            <avatar-component
                v-for="member in props.members"
                :key="member.identifier"
                :name="member.firstname"
                :photo-url="member.photoUrl"
                size="sm"
            ></avatar-component>
        </div>
    </header>
</template>
<style scoped>
.dashboard-header-component {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0.25rem 0.25rem;
}

h1 {
    margin: 0;
    font-size: 1.875rem;
    font-weight: 800;
}

.date {
    margin: 0.25rem 0 0;
    color: var(--bably-muted-text);
    font-size: 0.9375rem;
}

.date::first-letter {
    text-transform: uppercase;
}

.avatars {
    display: flex;
    flex-shrink: 0;
}

.avatars > * + * {
    margin-left: -0.5rem;
}

.avatars > * {
    box-shadow: 0 0 0 2px var(--ion-background-color);
}
</style>
