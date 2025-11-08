<template>
  <div class="h-screen overflow-hidden">
    <PassItem
      v-model:details="item.details"
      v-model:key-values-add="item.keyValuesAdd"
      v-model:key-values-delete="item.keyValuesDelete"
      v-model:key-values="item.keyValues"
      v-model:snapshots="item.snapshots"
      v-model:attachments="item.attachments"
      v-model:attachments-to-add="item.attachmentsToAdd"
      v-model:attachments-to-delete="item.attachmentsToDelete"
      :read-only
      @close="onClose()"
      @submit="onUpdateAsync"
    />

    <PassMenuBottom
      :has-changes
      :show-edit-button="readOnly && !hasChanges"
      :show-readonly-button="!readOnly && !hasChanges"
      :show-save-button="!readOnly && hasChanges"
      show-close-button
      show-delete-button
      @close="onClose"
      @delete="showConfirmDeleteDialog = true"
      @edit="readOnly = false"
      @readonly="readOnly = true"
      @save="onUpdateAsync"
    />

    <PassDialogDeleteItem
      v-model:open="showConfirmDeleteDialog"
      @abort="showConfirmDeleteDialog = false"
      @confirm="deleteItemAsync"
    />

    <PassDialogUnsavedChanges
      v-model:ignore-changes="ignoreChanges"
      v-model:open="showUnsavedChangesDialog"
      :has-changes="hasChanges"
      @abort="showUnsavedChangesDialog = false"
      @confirm="onConfirmIgnoreChanges"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  SelectHaexPasswordsItemDetails,
  SelectHaexPasswordsItemKeyValues,
  SelectHaexPasswordsItemSnapshots,
  SelectHaexPasswordsItemBinaries,
} from "~/database";

definePageMeta({
  name: "passwordItemEdit",
});

const { activeTabIndex } = storeToRefs(useUiStore());
activeTabIndex.value = "0";

const readOnly = ref(true);
const showConfirmDeleteDialog = ref(false);
const { t } = useI18n();

interface AttachmentWithSize extends SelectHaexPasswordsItemBinaries {
  size?: number;
}

const item = reactive<{
  details: SelectHaexPasswordsItemDetails;
  snapshots: SelectHaexPasswordsItemSnapshots[];
  keyValues: SelectHaexPasswordsItemKeyValues[];
  keyValuesAdd: SelectHaexPasswordsItemKeyValues[];
  keyValuesDelete: SelectHaexPasswordsItemKeyValues[];
  attachments: AttachmentWithSize[];
  attachmentsToAdd: AttachmentWithSize[];
  attachmentsToDelete: SelectHaexPasswordsItemBinaries[];
  originalDetails: SelectHaexPasswordsItemDetails | null;
  originalKeyValues: SelectHaexPasswordsItemKeyValues[] | null;
  originalAttachments: AttachmentWithSize[] | null;
}>({
  details: {
    id: "",
    createdAt: null,
    icon: null,
    note: null,
    password: null,
    tags: null,
    title: null,
    updateAt: null,
    url: null,
    username: null,
    otpSecret: null,
  },
  keyValues: [],
  snapshots: [],
  keyValuesAdd: [],
  keyValuesDelete: [],
  attachments: [],
  attachmentsToAdd: [],
  attachmentsToDelete: [],
  originalDetails: {
    id: "",
    createdAt: null,
    icon: null,
    note: null,
    password: null,
    tags: null,
    title: null,
    updateAt: null,
    url: null,
    username: null,
    otpSecret: null,
  },
  originalKeyValues: null,
  originalAttachments: null,
});

const { currentItem } = storeToRefs(usePasswordItemStore());

watch(
  currentItem,
  () => {
    if (!currentItem.value) return;
    item.details = JSON.parse(JSON.stringify(currentItem.value?.details));
    item.keyValues = JSON.parse(JSON.stringify(currentItem.value?.keyValues));
    item.snapshots = JSON.parse(JSON.stringify(currentItem.value?.snapshots));
    item.attachments = JSON.parse(
      JSON.stringify(currentItem.value?.attachments)
    );
    item.keyValuesAdd = [];
    item.keyValuesDelete = [];
    item.attachmentsToAdd = [];
    item.attachmentsToDelete = [];
    item.originalDetails = JSON.parse(
      JSON.stringify(currentItem.value?.details)
    );
    item.originalKeyValues = JSON.parse(
      JSON.stringify(currentItem.value?.keyValues)
    );
    item.originalAttachments = JSON.parse(
      JSON.stringify(currentItem.value?.attachments)
    );
  },
  { immediate: true }
);

const { add } = useToast();
const { deleteAsync, updateAsync } = usePasswordItemStore();
const { syncGroupItemsAsync } = usePasswordGroupStore();
const { currentGroupId, inTrashGroup } = storeToRefs(usePasswordGroupStore());

const ignoreChanges = ref(false);
const onUpdateAsync = async () => {
  try {
    const newId = await updateAsync({
      details: item.details,
      groupId: currentGroupId.value || null,
      keyValues: item.keyValues,
      keyValuesAdd: item.keyValuesAdd,
      keyValuesDelete: item.keyValuesDelete,
      attachments: item.attachments,
      attachmentsToAdd: item.attachmentsToAdd,
      attachmentsToDelete: item.attachmentsToDelete,
    });
    if (newId) add({ color: "success", description: t("success.update") });
    syncGroupItemsAsync();
    ignoreChanges.value = true;
    // Reset read-only state after saving
    readOnly.value = true;
  } catch (error) {
    console.log(error);
    add({ color: "error", description: t("error.update") });
  }
};

const onClose = () => {
  if (showConfirmDeleteDialog.value || showUnsavedChangesDialog.value) return;

  if (hasChanges.value && !ignoreChanges.value)
    return (showUnsavedChangesDialog.value = true);

  readOnly.value = true;
  useRouter().back();
};

const deleteItemAsync = async () => {
  try {
    await deleteAsync(item.details.id, inTrashGroup.value);
    showConfirmDeleteDialog.value = false;
    add({ color: "success", description: t("success.delete") });
    await syncGroupItemsAsync();
    onClose();
  } catch (errro) {
    console.log(errro);
    add({
      color: "error",
      description: t("error.delete"),
    });
  }
};

const hasChanges = computed(() => {
  return !(
    JSON.stringify(item.originalDetails) === JSON.stringify(item.details) &&
    JSON.stringify(item.originalKeyValues) === JSON.stringify(item.keyValues) &&
    JSON.stringify(item.originalAttachments) ===
      JSON.stringify(item.attachments) &&
    !item.keyValuesAdd.length &&
    !item.keyValuesDelete.length &&
    !item.attachmentsToAdd.length &&
    !item.attachmentsToDelete.length
  );
});

const showUnsavedChangesDialog = ref(false);
const onConfirmIgnoreChanges = () => {
  showUnsavedChangesDialog.value = false;
  ignoreChanges.value = true;
  onClose();
};
</script>

<i18n lang="yaml">
de:
  success:
    update: Eintrag erfolgreich aktualisiert
    delete: Eintrag wurde gelöscht
  error:
    update: Eintrag konnte nicht aktualisiert werden
    delete: Eintrag konnte nicht gelöscht werden
  tab:
    details: Details
    keyValue: Extra
    history: Verlauf

en:
  success:
    update: Entry successfully updated
    delete: Entry successfully removed
  error:
    update: Entry could not be updated
    delete: Entry could not be deleted
  tab:
    details: Details
    keyValue: Extra
    history: History
</i18n>
