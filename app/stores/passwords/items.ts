import { eq, isNull } from "drizzle-orm";
import {
  haexPasswordsGroupItems,
  haexPasswordsItemDetails,
  haexPasswordsItemHistory,
  haexPasswordsItemKeyValues,
  type InsertHaexPasswordsItemDetails,
  type InserthaexPasswordsItemKeyValues,
  type SelectHaexPasswordsGroupItems,
  type SelectHaexPasswordsGroups,
  type SelectHaexPasswordsItemDetails,
  type SelectHaexPasswordsItemHistory,
  type SelectHaexPasswordsItemKeyValues,
} from "~/database";
import { getSingleRouteParam } from "~/utils/helper";

export const usePasswordItemStore = defineStore("passwordItemStore", () => {
  const currentItemId = computed({
    get: () =>
      getSingleRouteParam(useRouter().currentRoute.value.params.itemId),
    set: (entryId) => {
      useRouter().currentRoute.value.params.entryId = entryId ?? "";
    },
  });

  const currentItem = ref<{
    details: SelectHaexPasswordsItemDetails;
    history: SelectHaexPasswordsItemHistory[];
    keyValues: SelectHaexPasswordsItemKeyValues[];
  } | null>(null);

  // Watch currentItemId and update currentItem
  watch(
    currentItemId,
    async (newId) => {
      if (newId) {
        currentItem.value = await readAsync(newId);
      } else {
        currentItem.value = null;
      }
    },
    { immediate: false }
  );

  const items = ref<
    {
      haex_passwords_item_details: SelectHaexPasswordsItemDetails;
      haex_passwords_group_items: SelectHaexPasswordsGroupItems;
    }[]
  >([]);

  const syncItemsAsync = async () => {
    const haexhubStore = useHaexHubStore();
    if (!haexhubStore.db) throw new Error("Database not initialized");

    const result = await haexhubStore.db
      .select()
      .from(haexPasswordsItemDetails)
      .innerJoin(
        haexPasswordsGroupItems,
        eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
      );

    // Type assertion needed for sqlite-proxy join results
    items.value = result as unknown as typeof items.value;
  };

  return {
    currentItemId,
    currentItem,
    addAsync,
    addKeyValueAsync,
    addKeyValuesAsync,
    deleteAsync,
    deleteKeyValueAsync,
    items,
    readByGroupIdAsync,
    readAsync,
    readKeyValuesAsync,
    syncItemsAsync,
    updateAsync,
  };
});

const addAsync = async (
  details: SelectHaexPasswordsItemDetails,
  keyValues: SelectHaexPasswordsItemKeyValues[],
  group?: SelectHaexPasswordsGroups | null
) => {
  const haexhubStore = useHaexHubStore();

  const newDetails: InsertHaexPasswordsItemDetails = {
    id: crypto.randomUUID(),
    icon: details.icon || group?.icon || null,
    note: details.note,
    password: details.password,
    tags: details.tags,
    title: details.title,
    url: details.url,
    username: details.username,
  };

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = keyValues.map(
    (keyValue) => ({
      id: crypto.randomUUID(),
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    })
  );

  try {
    if (!haexhubStore.db) throw new Error("Database not initialized");

    // Insert item details
    await haexhubStore.db.insert(haexPasswordsItemDetails).values(newDetails);

    // Insert group item relation
    const groupItemData = { itemId: newDetails.id, groupId: group?.id ?? null };
    await haexhubStore.db.insert(haexPasswordsGroupItems).values(groupItemData);

    // Insert key values if any
    if (newKeyValues.length) {
      await haexhubStore.db
        .insert(haexPasswordsItemKeyValues)
        .values(newKeyValues);
    }
  } catch (error) {
    console.error("ERROR addItem", error);
  }

  return newDetails.id;
};

const addKeyValueAsync = async (
  item?: InserthaexPasswordsItemKeyValues | null,
  itemId?: string
) => {
  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.db) throw new Error("Database not initialized");

  const newKeyValue: InserthaexPasswordsItemKeyValues = {
    id: crypto.randomUUID(),
    itemId: item?.itemId || itemId,
    key: item?.key,
    value: item?.value,
  };

  try {
    return await haexhubStore.db
      .insert(haexPasswordsItemKeyValues)
      .values(newKeyValue);
  } catch (error) {
    console.error("ERROR addItem", error);
  }
};

const addKeyValuesAsync = async (
  items: InserthaexPasswordsItemKeyValues[],
  itemId?: string
) => {
  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.db) throw new Error("Database not initialized");

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = items?.map(
    (item) => ({
      id: crypto.randomUUID(),
      itemId: item.itemId || itemId,
      key: item.key,
      value: item.value,
    })
  );

  try {
    return await haexhubStore.db
      .insert(haexPasswordsItemKeyValues)
      .values(newKeyValues);
  } catch (error) {
    console.error("ERROR addItem", error);
  }
};

const readByGroupIdAsync = async (groupId?: string | null) => {
  try {
    const haexhubStore = useHaexHubStore();
    if (!haexhubStore.db) throw new Error("Database not initialized");

    type EntryType = {
      haex_passwords_item_details: SelectHaexPasswordsItemDetails;
      haex_passwords_group_items: SelectHaexPasswordsGroupItems;
    };

    let entries: EntryType[];

    if (groupId) {
      const result = await haexhubStore.db
        .select()
        .from(haexPasswordsGroupItems)
        .innerJoin(
          haexPasswordsItemDetails,
          eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
        )
        .where(eq(haexPasswordsGroupItems.groupId, groupId));
      entries = result as unknown as EntryType[];
    } else {
      const result = await haexhubStore.db
        .select()
        .from(haexPasswordsGroupItems)
        .innerJoin(
          haexPasswordsItemDetails,
          eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
        )
        .where(isNull(haexPasswordsGroupItems.groupId));
      entries = result as unknown as EntryType[];
    }

    return entries?.map((entry) => entry.haex_passwords_item_details);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const readAsync = async (itemId: string | null) => {
  if (!itemId) return null;

  try {
    const haexhubStore = useHaexHubStore();
    if (!haexhubStore.db) throw new Error("Database not initialized");

    const result = await haexhubStore.db
      .select()
      .from(haexPasswordsItemDetails)
      .where(eq(haexPasswordsItemDetails.id, itemId))
      .limit(1);

    const details = result[0] || null;

    if (!details) return null;

    const history = (await usePasswordHistoryStore().getAsync(itemId)) ?? [];
    const keyValues = (await readKeyValuesAsync(itemId)) ?? [];

    return { details, history, keyValues };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const readKeyValuesAsync = async (itemId: string | null) => {
  if (!itemId) return null;
  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.db) throw new Error("Database not initialized");

  const keyValues = await haexhubStore.db
    .select()
    .from(haexPasswordsItemKeyValues)
    .where(eq(haexPasswordsItemKeyValues.itemId, itemId));

  return keyValues;
};

const updateAsync = async ({
  details,
  keyValues,
  keyValuesAdd,
  keyValuesDelete,
  groupId,
}: {
  details: SelectHaexPasswordsItemDetails;
  keyValues: SelectHaexPasswordsItemKeyValues[];
  keyValuesAdd: SelectHaexPasswordsItemKeyValues[];
  keyValuesDelete: SelectHaexPasswordsItemKeyValues[];
  groupId: string | null;
}) => {
  const haexhubStore = useHaexHubStore();

  if (!details.id) return;

  const newDetails: InsertHaexPasswordsItemDetails = {
    id: details.id,
    icon: details.icon,
    note: details.note,
    password: details.password,
    tags: details.tags,
    title: details.title,
    url: details.url,
    username: details.username,
  };

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = keyValues
    .map((keyValue) => ({
      id: keyValue.id,
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    }))
    .filter((keyValue) => keyValue.id);

  const newKeyValuesAdd: InserthaexPasswordsItemKeyValues[] = keyValuesAdd.map(
    (keyValue) => ({
      id: keyValue.id || crypto.randomUUID(),
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    })
  );

  try {
    if (!haexhubStore.db) throw new Error("Database not initialized");

    // Update item details
    await haexhubStore.db
      .update(haexPasswordsItemDetails)
      .set(newDetails)
      .where(eq(haexPasswordsItemDetails.id, newDetails.id));

    // Update group item relation
    await haexhubStore.db
      .update(haexPasswordsGroupItems)
      .set({ itemId: newDetails.id, groupId })
      .where(eq(haexPasswordsGroupItems.itemId, newDetails.id));

    // Update existing key values
    for (const keyValue of newKeyValues) {
      await haexhubStore.db
        .update(haexPasswordsItemKeyValues)
        .set(keyValue)
        .where(eq(haexPasswordsItemKeyValues.id, keyValue.id));
    }

    // Add new key values
    if (newKeyValuesAdd.length) {
      await haexhubStore.db
        .insert(haexPasswordsItemKeyValues)
        .values(newKeyValuesAdd);
    }

    // Delete key values
    for (const keyValue of keyValuesDelete) {
      await haexhubStore.db
        .delete(haexPasswordsItemKeyValues)
        .where(eq(haexPasswordsItemKeyValues.id, keyValue.id));
    }

    return newDetails.id;
  } catch (error) {
    console.error("ERROR updateItem", error);
    throw error;
  }
};

const deleteAsync = async (itemId: string, final: boolean = false) => {
  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.db) throw new Error("Database not initialized");

  const { createTrashIfNotExistsAsync, trashId } = usePasswordGroupStore();

  if (final) {
    try {
      // Delete key values
      await haexhubStore.db
        .delete(haexPasswordsItemKeyValues)
        .where(eq(haexPasswordsItemKeyValues.itemId, itemId));

      // Delete history
      await haexhubStore.db
        .delete(haexPasswordsItemHistory)
        .where(eq(haexPasswordsItemHistory.itemId, itemId));

      // Delete group items
      await haexhubStore.db
        .delete(haexPasswordsGroupItems)
        .where(eq(haexPasswordsGroupItems.itemId, itemId));

      // Delete item details
      await haexhubStore.db
        .delete(haexPasswordsItemDetails)
        .where(eq(haexPasswordsItemDetails.id, itemId));
    } catch (error) {
      console.error("ERROR deleteItem", error);
      throw error;
    }
  } else {
    if (await createTrashIfNotExistsAsync()) {
      await haexhubStore.db
        .update(haexPasswordsGroupItems)
        .set({ groupId: trashId })
        .where(eq(haexPasswordsGroupItems.itemId, itemId));
    }
  }
};

const deleteKeyValueAsync = async (id: string) => {
  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.db) throw new Error("Database not initialized");

  return await haexhubStore.db
    .delete(haexPasswordsItemKeyValues)
    .where(eq(haexPasswordsItemKeyValues.id, id));
};
