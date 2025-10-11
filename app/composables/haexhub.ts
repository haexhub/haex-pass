// composables/useHaexHub.ts
import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useHaexHub as useHaexHubSDK } from "@haexhub/sdk/vue";

export const useHaexHub = () => {
  const { currentThemeName } = storeToRefs(useUiStore());

  // Get reactive SDK instance
  const sdk = useHaexHubSDK({ debug: true });

  // Watch for context changes and update theme
  watch(
    () => sdk.context.value,
    (newContext) => {
      if (newContext) {
        currentThemeName.value = newContext.theme || "dark";
      }
    }
  );

  return sdk;
};
