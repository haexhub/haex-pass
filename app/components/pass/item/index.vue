<template>
  <UCard class="rounded p-0" @close="onClose">
    <div class="">
      <UTabs
        :items="tabs"
        variant="link"
        :ui="{ trigger: 'grow' }"
        class="gap-4 w-full h-screen"
      >
        <template #details>
          <div class="h-dvh pb-32">
            <PassItemDetails
              v-if="details"
              v-model="details"
              with-copy-button
              :read-only
              :defaultIcon
              v-model:prevent-close="preventClose"
              @submit="$emit('submit')"
            />
          </div>
        </template>

        <template #keyValue>
          <div class="h-dvh pb-32">
            <PassItemKeyValue
              v-if="keyValues"
              v-model="keyValues"
              v-model:items-to-add="keyValuesAdd"
              v-model:items-to-delete="keyValuesDelete"
              v-model:attachments="attachments"
              v-model:attachments-to-add="attachmentsToAdd"
              v-model:attachments-to-delete="attachmentsToDelete"
              :read-only
              :item-id="details!.id"
            />
          </div>
        </template>

        <template #history>
          <div class="h-dvh pb-32">
            <PassItemHistory v-model="snapshots" />
          </div>
        </template>
      </UTabs>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type {
  SelectHaexPasswordsItemDetails,
  SelectHaexPasswordsItemKeyValues,
  SelectHaexPasswordsItemBinaries,
  SelectHaexPasswordsItemSnapshots,
} from "~/database";

interface AttachmentWithSize extends SelectHaexPasswordsItemBinaries {
  size?: number;
}

defineProps<{
  defaultIcon?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  addKeyValue: [];
  removeKeyValue: [string];
  submit: [];
}>();

const readOnly = defineModel<boolean>("readOnly", { default: false });

const details = defineModel<SelectHaexPasswordsItemDetails | null>("details", {
  required: true,
});

const keyValues = defineModel<SelectHaexPasswordsItemKeyValues[]>("keyValues", {
  default: [],
});

const keyValuesAdd = defineModel<SelectHaexPasswordsItemKeyValues[]>(
  "keyValuesAdd",
  { default: [] }
);
const keyValuesDelete = defineModel<SelectHaexPasswordsItemKeyValues[]>(
  "keyValuesDelete",
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

const snapshots = defineModel<SelectHaexPasswordsItemSnapshots[]>("snapshots", {
  default: [],
});

const { t } = useI18n();

/* const id = reactive({
  details: useId(),
  keyValue: useId(),
  history: useId(),
  content: {},
}) */

const preventClose = ref(false);

const onClose = () => {
  if (preventClose.value) return;

  emit("close");
};

const tabs = ref<TabsItem[]>([
  {
    label: t("tab.details"),
    icon: "material-symbols:key-outline",
    slot: "details" as const,
  },
  {
    label: t("tab.keyValue"),
    icon: "fluent:group-list-20-filled",
    slot: "keyValue" as const,
  },
  {
    label: t("tab.history"),
    icon: "material-symbols:history",
    slot: "history" as const,
  },
]);
</script>

<i18n lang="json">
{
  "de": {
    "create": "Anlegen",
    "abort": "Abbrechen",
    "tab": {
      "details": "Details",
      "keyValue": "Extra",
      "history": "Verlauf"
    }
  },
  "en": {
    "create": "Create",
    "abort": "Abort",
    "tab": {
      "details": "Details",
      "keyValue": "Extra",
      "history": "History"
    }
  }
}
</i18n>
