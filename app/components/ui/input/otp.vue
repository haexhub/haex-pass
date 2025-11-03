<template>
  <div class="space-y-2">
    <UiInput
      v-model="value"
      :label="t('label')"
      :read-only
      @keyup.enter="$emit('submit')"
      class="w-full"
    />

    <!-- OTP Code Display (only when there's a secret) -->
    <div
      v-if="value && totpCode"
      class="flex items-center gap-2 p-3 bg-muted rounded-lg"
    >
      <div class="flex-1">
        <div class="text-xs text-dimmed mb-1">{{ t("currentCode") }}</div>
        <div class="font-mono text-2xl font-bold tracking-wider">
          {{ formattedCode }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative w-10 h-10">
          <svg class="transform -rotate-90 w-10 h-10">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
              class="text-muted-foreground opacity-20"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
              class="text-primary transition-all duration-1000"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffset"
            />
          </svg>
          <div
            class="absolute inset-0 flex items-center justify-center text-xs font-medium"
          >
            {{ remainingSeconds }}
          </div>
        </div>
        <UiButton
          :color="copied ? 'success' : 'neutral'"
          :tooltip="t('copy')"
          :icon="copied ? 'mdi:check' : 'mdi:content-copy'"
          size="sm"
          variant="link"
          @click="copy(`${totpCode}`)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TOTP } from "otpauth";
import { useClipboard } from "@vueuse/core";
import type { AcceptableValue } from "@nuxt/ui/runtime/types/utils.js";

defineProps<{
  readOnly?: boolean;
}>();

defineEmits(["submit"]);

const value = defineModel<AcceptableValue | undefined>();
const { t } = useI18n();
const { copy, copied } = useClipboard();
const toast = useToast();

const totpCode = ref<string>("");
const remainingSeconds = ref<number>(30);

// Circle animation values
const circumference = 2 * Math.PI * 16; // radius = 16
const dashOffset = computed(() => {
  const progress = remainingSeconds.value / 30;
  return circumference * (1 - progress);
});

// Format code as XXX XXX for better readability
const formattedCode = computed(() => {
  if (!totpCode.value) return "";
  return totpCode.value.replace(/(\d{3})(\d{3})/, "$1 $2");
});

// Generate TOTP code
const generateCodeAsync = async () => {
  if (!value.value || typeof value.value !== "string") {
    totpCode.value = "";
    return;
  }

  try {
    const totp = new TOTP({
      secret: value.value,
      digits: 6,
      period: 30,
    });
    totpCode.value = totp.generate();
  } catch (error) {
    console.error("Error generating TOTP:", error);
    totpCode.value = "";
  }
};

// Update remaining seconds
const updateRemainingSeconds = () => {
  const now = Math.floor(Date.now() / 1000);
  remainingSeconds.value = 30 - (now % 30);
};

// Update code and timer
let intervalId: ReturnType<typeof setInterval> | null = null;

watch(value, () => {
  generateCodeAsync();
});

onMounted(() => {
  if (value.value) {
    generateCodeAsync();
  }

  // Update every second
  intervalId = setInterval(() => {
    updateRemainingSeconds();

    // Regenerate code when timer resets
    if (remainingSeconds.value === 30) {
      generateCodeAsync();
    }
  }, 1000);

  // Initial update
  updateRemainingSeconds();
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<i18n lang="yaml">
de:
  label: OTP Secret
  scanQr: QR-Code scannen
  currentCode: Aktueller Code
  copyCode: Code kopieren
  codeCopied: Code kopiert
  copy: Kopieren

en:
  label: OTP Secret
  scanQr: Scan QR code
  currentCode: Current code
  copyCode: Copy code
  codeCopied: Code copied
  copy: Copy
</i18n>
