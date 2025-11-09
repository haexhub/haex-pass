<template>
  <UApp :locale="currentLocaleData">
    <NuxtPage />
    <div v-if="!haexhubStore.state.isSetupComplete" class="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div class="text-center">
        <div class="mb-4">Initializing...</div>
        <UProgress animation="carousel" />
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";

const { currentLocale } = storeToRefs(useUiStore());
const haexhubStore = useHaexHubStore();

// Compute locale data based on current locale
const currentLocaleData = computed(() => {
  return locales[currentLocale.value as keyof typeof locales];
});

// Initialize HaexHub and wait for setup completion
onMounted(async () => {
  await haexhubStore.initializeAsync();
  await haexhubStore.waitForSetupAsync();
});
</script>
