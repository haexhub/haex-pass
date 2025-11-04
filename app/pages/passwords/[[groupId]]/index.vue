<template>
  <div class="flex flex-1">
    <div class="flex flex-col flex-1">
      <PassHeader />

      <PassGroupBreadcrumbs
        v-show="breadCrumbs.length"
        :items="breadCrumbs"
        class="sticky top-0 z-10 bg-default"
      />
      <PassMobileMenu
        ref="listRef"
        v-model:selected-items="selectedItems"
        :menu-items="groupItems"
      />

      <div
        class="fixed bottom-16 flex justify-between transition-all w-full sm:items-center items-end px-8 z-40"
      >
        <div class="w-full" />

        <UDropdownMenu v-model:open="open" :items="menu">
          <UButton
            icon="mdi:plus"
            :ui="{
              base: 'rotate-45 z-40',
              leadingIcon: [open ? 'rotate-0' : 'rotate-45', 'transition-all'],
            }"
            size="xl"
          />
        </UDropdownMenu>

        <div
          class="flex flex-col sm:flex-row gap-4 w-full justify-end items-end"
        >
          <UiButton
            v-show="selectedItems.size === 1"
            color="secondary"
            icon="mdi:pencil"
            :tooltip="t('edit')"
            @click="onEditAsync"
          />

          <UiButton
            v-show="selectedItems.size"
            color="secondary"
            :tooltip="t('cut')"
            icon="mdi:scissors"
            @click="onCut"
          />

          <UiButton
            v-show="selectedGroupItems?.length"
            color="secondary"
            icon="proicons:clipboard-paste"
            :tooltip="t('paste')"
            @click="onPasteAsync"
          />

          <UiButton
            v-show="selectedItems.size"
            color="secondary"
            icon="mdi:trash-outline"
            :tooltip="t('delete')"
            @click="onDeleteAsync"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IPasswordMenuItem } from "~/components/pass/mobile/menu/types";
import { onKeyStroke, onClickOutside } from "@vueuse/core";
import Fuse from "fuse.js";
import { getTableName } from "drizzle-orm";
import { haexPasswordsGroupItems, haexPasswordsItemDetails } from "~/database";

definePageMeta({
  name: "passwordGroupItems",
});

const open = ref(false);

const { t } = useI18n();

const { add } = useToast();

const selectedItems = ref<Set<IPasswordMenuItem>>(new Set());
const { menu } = storeToRefs(usePasswordsActionMenuStore());

// Initial sync is handled automatically by the watch in usePasswordGroupStore
const { syncGroupItemsAsync } = usePasswordGroupStore();

const {
  currentGroupId,
  inTrashGroup,
  selectedGroupItems,
  groups,
  breadCrumbs,
} = storeToRefs(usePasswordGroupStore());

const { items } = storeToRefs(usePasswordItemStore());
const { search } = storeToRefs(useSearchStore());

// Get the actual prefixed table names from Drizzle
const groupItemsTableName = getTableName(haexPasswordsGroupItems);
const itemDetailsTableName = getTableName(haexPasswordsItemDetails);

// Helper function to check if a group is in trash
const isGroupInTrash = (groupId: string | null | undefined): boolean => {
  if (!groupId) return false;
  if (groupId === "trash") return true;

  const group = groups.value.find((g) => g.id === groupId);
  if (!group) return false;

  return isGroupInTrash(group.parentId);
};

// Cache Fuse.js instance for better performance
let fuseInstance: Fuse<(typeof items.value)[number]> | null = null;
let lastItemsLength = 0;

const groupItems = computed<IPasswordMenuItem[]>(() => {
  const menuItems: IPasswordMenuItem[] = [];

  // When searching, only show groups if search is empty
  const filteredGroups = search.value
    ? [] // Don't show groups when searching
    : groups.value.filter((group) => group.parentId == currentGroupId.value);

  const filteredItems = search.value
    ? (() => {
        // Recreate Fuse instance only when items change
        if (!fuseInstance || lastItemsLength !== items.value.length) {
          fuseInstance = new Fuse(items.value, {
            keys: [
              `${itemDetailsTableName}.title`,
              `${itemDetailsTableName}.note`,
              `${itemDetailsTableName}.password`,
              `${itemDetailsTableName}.tags`,
              `${itemDetailsTableName}.url`,
              `${itemDetailsTableName}.username`,
            ],
            threshold: 0.4, // More lenient matching
            ignoreLocation: true, // Don't care where in the string the match is
          });
          lastItemsLength = items.value.length;
        }
        return fuseInstance.search(search.value).map((match) => match.item);
      })()
    : items.value.filter((item) => {
        const itemRecord = item as Record<string, Record<string, unknown>>;
        return itemRecord[groupItemsTableName]?.groupId == currentGroupId.value;
      });

  menuItems.push(
    ...filteredGroups.map<IPasswordMenuItem>((group) => ({
      color: group.color,
      icon: group.icon,
      id: group.id,
      name: group.name,
      type: "group",
      inTrash: isGroupInTrash(group.id),
    }))
  );

  menuItems.push(
    ...filteredItems.map<IPasswordMenuItem>((item) => {
      const itemRecord = item as Record<string, Record<string, unknown>>;
      const details = itemRecord[itemDetailsTableName];
      const groupItem = itemRecord[groupItemsTableName];
      return {
        icon: details?.icon as string | null,
        id: details?.id as string,
        name: details?.title as string | null,
        type: "item",
        inTrash: isGroupInTrash(groupItem?.groupId as string | null),
      };
    })
  );

  return menuItems;
});

const onEditAsync = async () => {
  const item = selectedItems.value.values().next().value;

  if (item?.type === "group")
    await navigateTo(
      useLocalePath()({
        name: "passwordGroupEdit",
        params: { groupId: item.id },
      })
    );
  else if (item?.type === "item") {
    await navigateTo(
      useLocalePath()({
        name: "passwordItemEdit",
        params: { itemId: item.id },
      })
    );
  }
};

onKeyStroke("e", async (e) => {
  if (e.ctrlKey) {
    await onEditAsync();
  }
});

const onCut = () => {
  selectedGroupItems.value = Array.from(selectedItems.value);
  selectedItems.value.clear();
};
onKeyStroke("x", (event) => {
  if (event.ctrlKey && selectedItems.value.size) {
    event.preventDefault();
    onCut();
  }
});

const { insertGroupItemsAsync } = usePasswordGroupStore();

const onPasteAsync = async () => {
  if (!selectedGroupItems.value?.length) return;

  try {
    await insertGroupItemsAsync(
      [...selectedGroupItems.value],
      currentGroupId.value
    );
    await syncGroupItemsAsync();
    selectedGroupItems.value = [];
    selectedItems.value.clear();
  } catch (error) {
    console.error(error);
    selectedGroupItems.value = [];
    add({ color: "error", description: t("error.paste") });
  }
};
onKeyStroke("v", async (event) => {
  if (event.ctrlKey) {
    await onPasteAsync();
  }
});

/* const { escape } = useMagicKeys()
whenever(escape, () => {
  selectedItems.value.clear()
}) */

onKeyStroke("escape", () => selectedItems.value.clear());

onKeyStroke("a", (event) => {
  if (event.ctrlKey) {
    event.preventDefault();
    event.stopImmediatePropagation();
    selectedItems.value = new Set(groupItems.value);
  }
});

const { deleteAsync } = usePasswordItemStore();
const { deleteGroupAsync } = usePasswordGroupStore();

const onDeleteAsync = async () => {
  if (selectedItems.value.size === 0) return;

  const itemsToDelete = Array.from(selectedItems.value);
  let successCount = 0;
  let errorCount = 0;

  for (const item of itemsToDelete) {
    try {
      // If item is already in trash, delete permanently
      const deletePermanently = item.inTrash || false;

      if (item.type === "group") {
        await deleteGroupAsync(item.id, deletePermanently);
      } else if (item.type === "item") {
        await deleteAsync(item.id, deletePermanently);
      }

      successCount++;
    } catch (error) {
      console.error(`Error deleting ${item.type} ${item.id}:`, error);
      errorCount++;
    }
  }

  selectedItems.value.clear();
  await syncGroupItemsAsync();

  if (errorCount > 0) {
    add({
      color: "error",
      description: t("error.deletePartial", {
        success: successCount,
        failed: errorCount,
      }),
    });
  } else {
    add({
      color: "success",
      description: t(
        inTrashGroup.value
          ? "success.deletedPermanently"
          : "success.deletedToTrash"
      ),
    });
  }
};
onKeyStroke("Delete", (event) => {
  if (selectedItems.value.size > 0) {
    event.preventDefault();
    onDeleteAsync();
  }
});

onKeyStroke("Backspace", (event) => {
  if (selectedItems.value.size > 0) {
    event.preventDefault();
    onDeleteAsync();
  }
});

const listRef = useTemplateRef<HTMLElement>("listRef");
onClickOutside(listRef, () =>
  setTimeout(() => selectedItems.value.clear(), 50)
);
</script>

<i18n lang="yaml">
de:
  cut: Ausschneiden
  paste: Einfügen
  delete: Löschen
  edit: Bearbeiten
  wtf: "wtf"
  success:
    deletedToTrash: Erfolgreich in den Papierkorb verschoben
    deletedPermanently: Erfolgreich gelöscht
  error:
    delete: Fehler beim Löschen
    paste: Fehler beim Einfügen
    deletePartial: "{success} erfolgreich gelöscht, {failed} fehlgeschlagen"
en:
  cut: Cut
  paste: Paste
  delete: Delete
  edit: Edit
  success:
    deletedToTrash: Successfully moved to trash
    deletedPermanently: Successfully deleted
  error:
    delete: Error deleting items
    paste: Error pasting items
    deletePartial: "{success} deleted successfully, {failed} failed"
</i18n>
