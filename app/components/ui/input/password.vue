<template>
  <UiInput
    ref="uiInputRef"
    v-model="value"
    :label="label || t('label')"
    :leading-icon
    :placeholder="placeholder || ' '"
    :read-only
    :type="show ? 'text' : 'password'"
    :with-copy-button
    :check-input="checkInput"
    v-bind="$attrs"
    @keyup="$emit('keyup', $event)"
  >
    <template #trailing>
      <div class="flex items-center gap-1">
        <UiButton
          v-if="withGenerator && !readOnly"
          :aria-label="t('generate')"
          color="neutral"
          variant="link"
          icon="i-lucide-wand-sparkles"
          :tooltip="t('generate')"
          size="sm"
          @click="showGenerator = true"
        />
        <UiButton
          aria-controls="password"
          color="neutral"
          variant="link"
          :aria-label="show ? t('hide') : t('show')"
          :aria-pressed="show"
          :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :tooltip="show ? t('hide') : t('show')"
          size="sm"
          @click="show = !show"
        />
      </div>
    </template>
  </UiInput>

  <PassDialogPasswordGenerator
    v-if="showGenerator"
    v-model:open="showGenerator"
    v-model="value"
  />
</template>

<script setup lang="ts">
import type { AcceptableValue } from "@nuxt/ui/runtime/types/utils.js";

defineOptions({
  inheritAttrs: false,
});

const { readOnly, withGenerator, checkInput, label, placeholder, leadingIcon, withCopyButton } = defineProps<{
  label?: string;
  placeholder?: string;
  leadingIcon?: string;
  withCopyButton?: boolean;
  readOnly?: boolean;
  withGenerator?: boolean;
  checkInput?: boolean;
}>();

defineEmits<{
  keyup: [event: KeyboardEvent];
}>();

const value = defineModel<AcceptableValue | undefined>();

const show = ref(false);
const showGenerator = ref(false);
const { t } = useI18n();

// Template ref for UiInput
const uiInputRef = useTemplateRef("uiInputRef");

// Expose inputRef from UiInput so parent components can access it
defineExpose({
  inputRef: computed(() => uiInputRef.value?.inputRef),
});
</script>

<i18n lang="yaml">
de:
  show: Passwort ansehen
  hide: Passwort verstecken
  label: Passwort
  generate: Passwort generieren

en:
  show: Show password
  hide: Hide password
  label: Password
  generate: Generate password
</i18n>
