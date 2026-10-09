<script setup lang="ts"></script>
<template>
    <section class="component-page-header-component">
        <div class="titles">
            <div class="title">
                <slot name="title"></slot>
            </div>
            <div class="subtitle">
                <slot name="subtitle"></slot>
            </div>
        </div>
        <div class="right">
            <slot name="right"></slot>
        </div>
    </section>
</template>
<style scoped>
@import '@css/components/page-header-component.css';
</style>
