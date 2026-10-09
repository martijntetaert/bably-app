<script setup lang="ts">
import wordmark from '@/assets/wordmark.png';
import wordmarkWhite from '@/assets/wordmark-white.png';
</script>
<template>
    <span class="wordmark-component">
        <img class="light" :src="wordmark" alt="Bably" />
        <img class="dark" :src="wordmarkWhite" alt="" aria-hidden="true" />
    </span>
</template>
<style scoped>
.wordmark-component {
    display: inline-flex;
}

img {
    height: 2.5rem;
    width: auto;
}

.dark {
    display: none;
}

@media (prefers-color-scheme: dark) {
    .light {
        display: none;
    }

    .dark {
        display: block;
    }
}
</style>
