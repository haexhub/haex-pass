<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium">{{ label }}</label>

    <UPopover v-model:open="isOpen" :popper="{ placement: 'bottom-start' }">
      <UButton
        :icon="iconName || defaultIcon || 'mdi:key-outline'"
        :label="!iconName ? t('selectIcon') : undefined"
        variant="outline"
        color="neutral"
        :disabled="readOnly"
        class="w-full justify-start"
      />

      <template #content>
        <div class="p-4 w-96 max-h-[32rem] overflow-y-auto">
          <!-- Search -->
          <UiInput
            v-model="search"
            :placeholder="t('search')"
            class="mb-4 w-full"
            autofocus
          />

          <!-- Icon Grid -->
          <div class="grid grid-cols-8 gap-1">
            <button
              v-for="icon in filteredIcons"
              :key="icon"
              type="button"
              :class="[
                'p-2 rounded-lg border-2 transition-all hover:bg-muted flex items-center justify-center',
                iconName === icon
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent',
              ]"
              :title="icon"
              @click="selectIcon(icon)"
            >
              <UIcon :name="icon" class="w-5 h-5" />
            </button>
          </div>

          <div v-if="filteredIcons.length === 0" class="text-center text-dimmed py-8">
            {{ t('noResults') }}
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mt-4">
            <UButton
              v-if="iconName"
              :label="t('clear')"
              color="neutral"
              variant="outline"
              size="sm"
              class="flex-1"
              @click="clearIcon"
            />
            <UButton
              :label="t('close')"
              color="neutral"
              variant="solid"
              size="sm"
              class="flex-1"
              @click="isOpen = false"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  defaultIcon?: string;
  readOnly?: boolean;
}>();

const iconName = defineModel<string | undefined | null>();
const { t } = useI18n();

const isOpen = ref(false);
const search = ref("");

// Available icons - grouped by category
const icons = [
  // Keys & Security
  "mdi:key-outline",
  "mdi:key",
  "mdi:key-variant",
  "mdi:shield-outline",
  "mdi:shield-check-outline",
  "mdi:lock-outline",
  "mdi:lock-open-outline",
  "mdi:security",

  // Folders & Organization
  "mdi:folder-outline",
  "mdi:folder",
  "mdi:folder-lock-outline",
  "mdi:folder-key-outline",

  // Banking & Finance
  "proicons:bank",
  "mdi:credit-card-outline",
  "mdi:bitcoin",
  "mdi:piggy-bank-outline",
  "mdi:currency-usd",

  // Common Services & Shopping
  "mdi:email-outline",
  "fe:mail",
  "streamline:web",
  "mdi:shopping-outline",
  "mdi:cart-outline",
  "mdi:amazon",

  // Social & Communication
  "mdi:message-outline",
  "mdi:chat-outline",
  "mdi:phone-outline",
  "mdi:account-outline",
  "mdi:account-circle-outline",

  // Tech & Devices
  "mdi:laptop",
  "pepicons-pop:smartphone-home-button",
  "proicons:computer",
  "mdi:server",
  "mdi:database-outline",
  "proicons:cloud",
  "proicons:wi-fi",
  "meteor-icons:microchip",

  // Entertainment
  "proicons:game",
  "meteor-icons:headphones",
  "mdi:music-note-outline",
  "mdi:video-outline",
  "mdi:camera-outline",

  // Work & Productivity
  "mdi:briefcase-outline",
  "mdi:file-document-outline",
  "mdi:note-outline",
  "mdi:notebook-outline",
  "mdi:calendar-outline",
  "mdi:clock-outline",

  // Development
  "proicons:github",
  "proicons:wrench",
  "mdi:code-tags",
  "mdi:console",

  // Travel & Transport
  "mdi:airplane",
  "proicons:vehicle-car",
  "fxemoji:trolleybus",
  "mdi:train",
  "mdi:ticket-outline",
  "mdi:map-marker-outline",

  // Misc
  "mdi:home-outline",
  "mdi:bookmark-outline",
  "meteor-icons:star",
  "mdi:heart-outline",
  "mdi:tag-outline",
  "fe:rocket",
  "mdi:lightbulb-outline",
  "mdi:gift-outline",
];

const filteredIcons = computed(() => {
  if (!search.value) return icons;

  const searchLower = search.value.toLowerCase();
  return icons.filter((icon) =>
    icon.toLowerCase().includes(searchLower)
  );
});

const selectIcon = (icon: string) => {
  iconName.value = icon;
  isOpen.value = false;
  search.value = "";
};

const clearIcon = () => {
  iconName.value = null;
  search.value = "";
};
</script>

<i18n lang="yaml">
de:
  selectIcon: Icon auswählen
  search: Suchen...
  clear: Zurücksetzen
  close: Schließen
  noResults: Keine Icons gefunden

en:
  selectIcon: Select icon
  search: Search...
  clear: Clear
  close: Close
  noResults: No icons found
</i18n>
