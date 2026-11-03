<script setup lang="ts">
import { ref } from 'vue';
import { stores } from '@/api/bably';
import { useToast } from '@/composables/useToast';
import ButtonComponent from '@/components/button-component.vue';
import { StoreInterface, StoreLocationInterface } from '@/interfaces/StoreInterface';

const props = defineProps<{
    store: StoreInterface;
    suggestion: StoreLocationInterface;
}>();

const emit = defineEmits<{
    answered: [];
}>();

const toast = useToast();
const isAnswering = ref(false);

const answer = async (isThisStore: boolean): Promise<void> => {
    isAnswering.value = true;

    try {
        await stores.answerLocationSuggestion(props.store.identifier, isThisStore);
        emit('answered');
    } catch (error) {
        toast.failure(error);
    } finally {
        isAnswering.value = false;
    }
};
</script>
<template>
    <section class="component-store-location-question-component">
        <div class="what">
            <span class="question">Is dit {{ suggestion.name }}?</span>
            <span v-if="suggestion.address" class="address">{{ suggestion.address }}</span>
            <span class="why">Dan volgt je lijst ook de route van andere Bably-gebruikers in deze winkel.</span>
        </div>
        <div class="answers">
            <button-component variant="soft" :disabled="isAnswering" @click="answer(true)">Ja</button-component>
            <button-component variant="ghost" :disabled="isAnswering" @click="answer(false)">Nee</button-component>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/store-location-question-component.css';
</style>
