<template>
  <div class="p-2 space-y-6 h-full overflow-y-auto">
    <!-- Key-Value Pairs -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ t("customFields") }}</h3>
      </template>

      <div class="flex flex-wrap gap-2 items-start">
        <UiList v-if="items.length || itemsToAdd.length" class="flex-1 rounded-lg overflow-hidden">
          <li
            v-for="(item, index) in [...items, ...itemsToAdd]"
            :key="item.id"
            :class="{
              'bg-primary/20': currentSelected === item,
              'rounded-t-lg': index === 0,
              'rounded-b-lg': index === [...items, ...itemsToAdd].length - 1
            }"
            class="flex gap-2 hover:bg-primary/20 px-4 items-center"
            @click="currentSelected = item"
          >
            <button class="flex items-center no-underline w-full py-2">
              <input
                v-model="item.key"
                :readonly="currentSelected !== item || readOnly"
                class="flex-1 cursor-pointer bg-transparent border-none outline-none"
              />
            </button>

            <UiButton
              v-if="!readOnly"
              :class="[currentSelected === item ? 'visible' : 'invisible']"
              variant="outline"
              color="error"
              icon="mdi:trash-outline"
              @click="deleteItem(item.id)"
            />
          </li>
        </UiList>

        <UTextarea
          v-if="items.length || itemsToAdd.length"
          :readOnly="readOnly || !currentSelected"
          :label="t('value')"
          class="flex-1 min-w-52 border-base-content/25"
          v-model="currentValue"
          with-copy-button
        />
      </div>

      <template #footer v-if="!readOnly">
        <UiButton
          @click="addItem"
          icon="mdi:plus"
          :label="t('addField')"
          block
          color="primary"
          variant="outline"
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

const addItem = () => {
  itemsToAdd.value?.push({
    id: crypto.randomUUID(),
    itemId,
    key: "",
    value: "",
    updateAt: null,
  });
};

const deleteItem = (id: string) => {
  const item = items.value.find((item) => item.id === id);
  if (item) {
    itemsToDelete.value?.push(item);
    items.value = items.value.filter((item) => item.id !== id);
  }

  itemsToAdd.value = itemsToAdd.value?.filter((item) => item.id !== id) ?? [];
};
</script>

<i18n lang="yaml">
de:
  add: Hinzufügen
  addField: Feld hinzufügen
  key: Schlüssel
  value: Wert
  customFields: Benutzerdefinierte Felder
  attachments: Anhänge

en:
  add: Add
  addField: Add field
  key: Key
  value: Value
  customFields: Custom Fields
  attachments: Attachments
</i18n>
