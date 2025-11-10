<template>
  <div class="p-1 space-y-6 h-full overflow-y-auto">
    <!-- Key-Value Pairs -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ t("customFields") }}</h3>
      </template>

      <div class="flex flex-wrap gap-3 items-start">
        <UiList
          v-if="items.length || itemsToAdd.length"
          class="rounded-lg w-full sm:flex-1"
        >
          <TransitionGroup name="list" tag="div">
            <li
              v-for="(item, index) in [...items, ...itemsToAdd]"
              :key="item.id"
              :class="{
                'border border-primary': currentSelected === item,
                'border border-transparent': currentSelected !== item,
                'rounded-t-lg': index === 0,
                'rounded-b-lg': index === [...items, ...itemsToAdd].length - 1,
              }"
              class="flex gap-2 hover:bg-gray-500/5 px-2 items-center transition-all duration-200"
              @click="currentSelected = item"
            >
              <button
                class="flex items-center no-underline min-w-0 flex-1 py-2"
              >
                <input
                  :ref="el => { if (index === [...items, ...itemsToAdd].length - 1) lastKeyInput = el as HTMLInputElement }"
                  v-model="item.key"
                  :readonly="currentSelected !== item || readOnly"
                  class="w-full cursor-pointer bg-transparent border-none outline-none truncate"
                />
              </button>

              <UiButton
                v-if="!readOnly"
                :class="[currentSelected === item ? 'visible' : 'invisible']"
                class="shrink-0"
                variant="ghost"
                color="error"
                icon="mdi:trash-outline"
                @click="deleteItem(item.id)"
              />

              <UiButton
                :color="copied ? 'success' : 'neutral'"
                :tooltip="t('copy')"
                :icon="copied ? 'mdi:check' : 'mdi:content-copy'"
                class="shrink-0"
                size="sm"
                variant="link"
                @click="copy(`${item}`)"
              />
            </li>
          </TransitionGroup>
        </UiList>

        <UiTextarea
          v-if="items.length || itemsToAdd.length"
          v-model="currentValue"
          :label="t('value')"
          :read-only="readOnly || !currentSelected"
          class="flex-1 min-w-52 border-base-content/25"
          with-copy-button
        />
      </div>

      <template #footer v-if="!readOnly">
        <UiButton
          :label="t('addField')"
          icon="mdi:plus"
          block
          color="primary"
          variant="outline"
          @click="addItem"
        />
      </template>
    </UCard>

    <!-- Attachments Section -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ t("attachments") }}</h3>
      </template>

      <PassItemAttachments
        v-model="attachments"
        v-model:attachments-to-add="attachmentsToAdd"
        v-model:attachments-to-delete="attachmentsToDelete"
        :item-id="itemId"
        :read-only="readOnly"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useClipboard, useFocus } from "@vueuse/core";
import type {
  SelectHaexPasswordsItemKeyValues,
  SelectHaexPasswordsItemBinaries,
} from "~/database";

interface AttachmentWithSize extends SelectHaexPasswordsItemBinaries {
  size?: number;
}

const { itemId, readOnly } = defineProps<{
  readOnly?: boolean;
  itemId: string;
}>();

const items = defineModel<SelectHaexPasswordsItemKeyValues[]>({ default: [] });

const itemsToDelete = defineModel<SelectHaexPasswordsItemKeyValues[]>(
  "itemsToDelete",
  { default: [] }
);
const itemsToAdd = defineModel<SelectHaexPasswordsItemKeyValues[]>(
  "itemsToAdd",
  { default: [] }
);

const attachments = defineModel<AttachmentWithSize[]>("attachments", {
  default: [],
});
const attachmentsToAdd = defineModel<AttachmentWithSize[]>("attachmentsToAdd", {
  default: [],
});
const attachmentsToDelete = defineModel<SelectHaexPasswordsItemBinaries[]>(
  "attachmentsToDelete",
  { default: [] }
);

defineEmits<{ add: []; remove: [string] }>();

const { t } = useI18n();

const currentSelected = ref<SelectHaexPasswordsItemKeyValues | undefined>(
  items.value?.at(0)
);

const lastKeyInput = ref<HTMLInputElement>();
const { focused: lastKeyInputFocused } = useFocus(lastKeyInput);

watch(
  () => itemId,
  () => (currentSelected.value = items.value?.at(0))
);
//const currentValue = computed(() => currentSelected.value?.value || '')
const currentValue = computed({
  get: () => currentSelected.value?.value || "",
  set(newValue: string) {
    if (currentSelected.value) currentSelected.value.value = newValue;
  },
});

const addItem = async () => {
  const newItem = {
    id: crypto.randomUUID(),
    itemId,
    key: "",
    value: "",
    updateAt: null,
  };
  itemsToAdd.value?.push(newItem);
  currentSelected.value = newItem;

  // Focus the newly added input field
  await nextTick();
  lastKeyInputFocused.value = true;
};

const deleteItem = (id: string) => {
  const item = items.value.find((item) => item.id === id);
  if (item) {
    itemsToDelete.value?.push(item);
    items.value = items.value.filter((item) => item.id !== id);
  }

  itemsToAdd.value = itemsToAdd.value?.filter((item) => item.id !== id) ?? [];
};

const { copy, copied } = useClipboard();
</script>

<i18n lang="yaml">
de:
  addField: Feld hinzufügen
  key: Schlüssel
  value: Wert
  customFields: Benutzerdefinierte Felder
  attachments: Anhänge
  copy: Kopieren

en:
  addField: Add field
  key: Key
  value: Value
  customFields: Custom Fields
  attachments: Attachments
  copy: Copy
</i18n>
