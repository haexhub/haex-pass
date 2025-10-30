<template>
  <div v-if="haexhubStore.isSetupComplete">
    <UApp :locale="currentLocaleData">
      <NuxtPage />
    </UApp>
  </div>
  <div v-else>
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="mb-4">Initializing...</div>
        <UProgress animation="carousel" />
      </div>
    </div>
  </div>
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

  // Trigger initial data sync after setup is complete
  const { syncGroupItemsAsync } = usePasswordGroupStore();
  await syncGroupItemsAsync();
});
</script>
