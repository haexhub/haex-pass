<template>
  <UApp :locale="locales[currentLocale]">
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";
const { currentLocale } = storeToRefs(useUiStore());

// Initialize HaexHub context watcher
useHaexHub();
</script>
