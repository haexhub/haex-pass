<template>
  <UInput
    ref="inputRef"
    v-model="value"
    :placeholder="props.placeholder || ' '"
    :disabled="props.readOnly"
    :leading-icon="props.leadingIcon"
    :ui="{ base: 'peer' }"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
    @keyup="$emit('keyup', $event)"
    @keydown="$emit('keydown', $event)"
  >
    <label
      class="absolute pointer-events-none -top-2.5 left-0 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
    >
      <span
        class="inline-flex bg-default px-1"
        :class="props?.leadingIcon ? 'mx-6' : 'mx-0'"
      >
        {{ props?.label }}
      </span>
    </label>

    <template #trailing>
      <slot name="trailing" />

      <UiButton
        v-show="props.withClearButton && value"
        color="neutral"
        :tooltip="t('clear')"
        icon="mdi:close"
        size="sm"
        variant="link"
        @click="value = ''"
      />

      <UiButton
        v-show="props.withCopyButton"
        :color="copied ? 'success' : 'neutral'"
        :tooltip="t('copy')"
        :icon="copied ? 'mdi:check' : 'mdi:content-copy'"
        size="sm"
        variant="link"
        @click="copy(`${value}`)"
      />
    </template>

    <template v-for="(_, slotName) in filteredSlots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps" />
    </template>
  </UInput>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import type { InputProps } from "@nuxt/ui";
import type { AcceptableValue } from "@nuxt/ui/runtime/types/utils.js";

defineOptions({
  inheritAttrs: false,
});

const value = defineModel<AcceptableValue | undefined>();

interface IInputProps extends /* @vue-ignore */ InputProps {
  tooltip?: string;
}

const props = defineProps<
  IInputProps & {
    withCopyButton?: boolean;
    withClearButton?: boolean;
    readOnly?: boolean;
    label?: string;
    leadingIcon?: string;
  }
>();

defineEmits<{
  input: [Event];
  change: [Event];
  blur: [Event];
  keyup: [KeyboardEvent];
  keydown: [KeyboardEvent];
}>();

const { copy, copied } = useClipboard();

const { t } = useI18n();

const filteredSlots = computed(() => {
  return Object.fromEntries(
    Object.entries(useSlots()).filter(([name]) => name !== "trailing")
  );
});

// Template ref for UInput
const inputRef = useTemplateRef("inputRef");

// Expose inputRef from UInput so parent components can access the input element
defineExpose({
  inputRef: computed(() => inputRef.value?.inputRef),
});
</script>

<i18n lang="yaml">
de:
  copy: Kopieren
  clear: Löschen

en:
  copy: Copy
  clear: Clear
</i18n>
