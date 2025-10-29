import { eq, isNull } from 'drizzle-orm'
import { db } from '~/database'
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
  type SelectHaexPasswordsItemKeyValues,
} from '~/database/schemas'
import { getSingleRouteParam } from '~/utils/helper'

export const usePasswordItemStore = defineStore('passwordItemStore', () => {
  const currentItemId = computed({
    get: () =>
      getSingleRouteParam(useRouter().currentRoute.value.params.itemId),
    set: (entryId) => {
      console.log('set entryId', entryId)
      useRouter().currentRoute.value.params.entryId = entryId ?? ''
    },
  })

  const currentItem = ref<{
    details: SelectHaexPasswordsItemDetails
    history: any[]
    keyValues: SelectHaexPasswordsItemKeyValues[]
  } | null>(null)

  // Watch currentItemId and update currentItem
  watch(
    currentItemId,
    async (newId) => {
      if (newId) {
        currentItem.value = await readAsync(newId)
      } else {
        currentItem.value = null
      }
    },
    { immediate: true }
  )

  const items = ref<
    {
      haex_passwords_item_details: SelectHaexPasswordsItemDetails
      haex_passwords_group_items: SelectHaexPasswordsGroupItems
    }[]
  >([])

  const syncItemsAsync = async () => {
    const haexhub = useHaexHub()
    const query = db
      .select()
      .from(haexPasswordsItemDetails)
      .innerJoin(
        haexPasswordsGroupItems,
        eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
      )
      .toSQL()

    const result = await haexhub.db.query<{
      haex_passwords_item_details: SelectHaexPasswordsItemDetails
      haex_passwords_group_items: SelectHaexPasswordsGroupItems
    }>(query.sql, query.params)

    items.value = result ?? []
  }

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
  }
})

const addAsync = async (
  details: SelectHaexPasswordsItemDetails,
  keyValues: SelectHaexPasswordsItemKeyValues[],
  group?: SelectHaexPasswordsGroups | null
) => {
  const haexhub = useHaexHub()
  console.log('addItem', details, group)

  const newDetails: InsertHaexPasswordsItemDetails = {
    id: crypto.randomUUID(),
    icon: details.icon || group?.icon || null,
    note: details.note,
    password: details.password,
    tags: details.tags,
    title: details.title,
    url: details.url,
    username: details.username,
  }

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = keyValues.map(
    (keyValue) => ({
      id: crypto.randomUUID(),
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    })
  )

  try {
    // Insert item details
    const insertDetailsQuery = db
      .insert(haexPasswordsItemDetails)
      .values(newDetails)
      .toSQL()
    await haexhub.db.execute(insertDetailsQuery.sql, insertDetailsQuery.params)

    // Insert group item relation
    const insertGroupItemQuery = db
      .insert(haexPasswordsGroupItems)
      .values({ itemId: newDetails.id, groupId: group?.id ?? null })
      .toSQL()
    await haexhub.db.execute(
      insertGroupItemQuery.sql,
      insertGroupItemQuery.params
    )

    // Insert key values if any
    if (newKeyValues.length) {
      const insertKeyValuesQuery = db
        .insert(haexPasswordsItemKeyValues)
        .values(newKeyValues)
        .toSQL()
      await haexhub.db.execute(
        insertKeyValuesQuery.sql,
        insertKeyValuesQuery.params
      )
    }
  } catch (error) {
    console.error('ERROR addItem', error)
  }

  return newDetails.id
}

const addKeyValueAsync = async (
  item?: InserthaexPasswordsItemKeyValues | null,
  itemId?: string
) => {
  const haexhub = useHaexHub()

  const newKeyValue: InserthaexPasswordsItemKeyValues = {
    id: crypto.randomUUID(),
    itemId: item?.itemId || itemId,
    key: item?.key,
    value: item?.value,
  }

  try {
    const query = db
      .insert(haexPasswordsItemKeyValues)
      .values(newKeyValue)
      .toSQL()
    return await haexhub.db.execute(query.sql, query.params)
  } catch (error) {
    console.error('ERROR addItem', error)
  }
}

const addKeyValuesAsync = async (
  items: InserthaexPasswordsItemKeyValues[],
  itemId?: string
) => {
  const haexhub = useHaexHub()
  console.log('addKeyValues', items, itemId)

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = items?.map(
    (item) => ({
      id: crypto.randomUUID(),
      itemId: item.itemId || itemId,
      key: item.key,
      value: item.value,
    })
  )

  try {
    const query = db
      .insert(haexPasswordsItemKeyValues)
      .values(newKeyValues)
      .toSQL()
    return await haexhub.db.execute(query.sql, query.params)
  } catch (error) {
    console.error('ERROR addItem', error)
  }
}

const readByGroupIdAsync = async (groupId?: string | null) => {
  try {
    const haexhub = useHaexHub()

    console.log('get entries by groupId', groupId || null)

    let query
    if (groupId) {
      query = db
        .select()
        .from(haexPasswordsGroupItems)
        .innerJoin(
          haexPasswordsItemDetails,
          eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
        )
        .where(eq(haexPasswordsGroupItems.groupId, groupId))
        .toSQL()
    } else {
      query = db
        .select()
        .from(haexPasswordsGroupItems)
        .innerJoin(
          haexPasswordsItemDetails,
          eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
        )
        .where(isNull(haexPasswordsGroupItems.groupId))
        .toSQL()
    }

    const entries = await haexhub.db.query<{
      haex_passwords_item_details: SelectHaexPasswordsItemDetails
      haex_passwords_group_items: SelectHaexPasswordsGroupItems
    }>(query.sql, query.params)

    console.log('found entries by groupId', entries)
    return entries?.map((entry) => entry.haex_passwords_item_details)
  } catch (error) {
    console.error(error)
    return []
  }
}

const readAsync = async (itemId: string | null) => {
  if (!itemId) return null

  try {
    const haexhub = useHaexHub()

    const query = db
      .select()
      .from(haexPasswordsItemDetails)
      .where(eq(haexPasswordsItemDetails.id, itemId))
      .limit(1)
      .toSQL()

    const result = await haexhub.db.query<SelectHaexPasswordsItemDetails>(
      query.sql,
      query.params
    )
    const details = result[0] || null

    console.log('readAsync details', details)

    if (!details) return null

    const history = (await usePasswordHistoryStore().getAsync(itemId)) ?? []
    const keyValues = (await readKeyValuesAsync(itemId)) ?? []

    console.log('found item by id', { details, history, keyValues })
    return { details, history, keyValues }
  } catch (error) {
    console.error(error)
    throw error
  }
}

const readKeyValuesAsync = async (itemId: string | null) => {
  if (!itemId) return null
  const haexhub = useHaexHub()

  const query = db
    .select()
    .from(haexPasswordsItemKeyValues)
    .where(eq(haexPasswordsItemKeyValues.itemId, itemId))
    .toSQL()

  const keyValues = await haexhub.db.query<SelectHaexPasswordsItemKeyValues>(
    query.sql,
    query.params
  )
  return keyValues
}

const updateAsync = async ({
  details,
  keyValues,
  keyValuesAdd,
  keyValuesDelete,
  groupId,
}: {
  details: SelectHaexPasswordsItemDetails
  keyValues: SelectHaexPasswordsItemKeyValues[]
  keyValuesAdd: SelectHaexPasswordsItemKeyValues[]
  keyValuesDelete: SelectHaexPasswordsItemKeyValues[]
  groupId: string | null
}) => {
  const haexhub = useHaexHub()

  if (!details.id) return

  const newDetails: InsertHaexPasswordsItemDetails = {
    id: details.id,
    icon: details.icon,
    note: details.note,
    password: details.password,
    tags: details.tags,
    title: details.title,
    url: details.url,
    username: details.username,
  }

  const newKeyValues: InserthaexPasswordsItemKeyValues[] = keyValues
    .map((keyValue) => ({
      id: keyValue.id,
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    }))
    .filter((keyValue) => keyValue.id)

  const newKeyValuesAdd: InserthaexPasswordsItemKeyValues[] = keyValuesAdd.map(
    (keyValue) => ({
      id: keyValue.id || crypto.randomUUID(),
      itemId: newDetails.id,
      key: keyValue.key,
      value: keyValue.value,
    })
  )

  console.log(
    'update item',
    newDetails,
    newKeyValues,
    newKeyValuesAdd,
    groupId
  )

  try {
    // Update item details
    const updateDetailsQuery = db
      .update(haexPasswordsItemDetails)
      .set(newDetails)
      .where(eq(haexPasswordsItemDetails.id, newDetails.id))
      .toSQL()
    await haexhub.db.execute(updateDetailsQuery.sql, updateDetailsQuery.params)

    // Update group item relation
    const updateGroupItemQuery = db
      .update(haexPasswordsGroupItems)
      .set({ itemId: newDetails.id, groupId })
      .where(eq(haexPasswordsGroupItems.itemId, newDetails.id))
      .toSQL()
    await haexhub.db.execute(
      updateGroupItemQuery.sql,
      updateGroupItemQuery.params
    )

    // Update existing key values
    for (const keyValue of newKeyValues) {
      const updateKeyValueQuery = db
        .update(haexPasswordsItemKeyValues)
        .set(keyValue)
        .where(eq(haexPasswordsItemKeyValues.id, keyValue.id))
        .toSQL()
      await haexhub.db.execute(
        updateKeyValueQuery.sql,
        updateKeyValueQuery.params
      )
    }

    // Add new key values
    if (newKeyValuesAdd.length) {
      const insertKeyValuesQuery = db
        .insert(haexPasswordsItemKeyValues)
        .values(newKeyValuesAdd)
        .toSQL()
      await haexhub.db.execute(
        insertKeyValuesQuery.sql,
        insertKeyValuesQuery.params
      )
    }

    // Delete key values
    for (const keyValue of keyValuesDelete) {
      const deleteKeyValueQuery = db
        .delete(haexPasswordsItemKeyValues)
        .where(eq(haexPasswordsItemKeyValues.id, keyValue.id))
        .toSQL()
      await haexhub.db.execute(
        deleteKeyValueQuery.sql,
        deleteKeyValueQuery.params
      )
    }

    return newDetails.id
  } catch (error) {
    console.error('ERROR updateItem', error)
    throw error
  }
}

const deleteAsync = async (itemId: string, final: boolean = false) => {
  const haexhub = useHaexHub()
  const { createTrashIfNotExistsAsync, trashId } = usePasswordGroupStore()

  console.log('deleteAsync', itemId, final)

  if (final) {
    try {
      // Delete key values
      const deleteKeyValuesQuery = db
        .delete(haexPasswordsItemKeyValues)
        .where(eq(haexPasswordsItemKeyValues.itemId, itemId))
        .toSQL()
      await haexhub.db.execute(
        deleteKeyValuesQuery.sql,
        deleteKeyValuesQuery.params
      )

      // Delete history
      const deleteHistoryQuery = db
        .delete(haexPasswordsItemHistory)
        .where(eq(haexPasswordsItemHistory.itemId, itemId))
        .toSQL()
      await haexhub.db.execute(deleteHistoryQuery.sql, deleteHistoryQuery.params)

      // Delete group items
      const deleteGroupItemsQuery = db
        .delete(haexPasswordsGroupItems)
        .where(eq(haexPasswordsGroupItems.itemId, itemId))
        .toSQL()
      await haexhub.db.execute(
        deleteGroupItemsQuery.sql,
        deleteGroupItemsQuery.params
      )

      // Delete item details
      const deleteDetailsQuery = db
        .delete(haexPasswordsItemDetails)
        .where(eq(haexPasswordsItemDetails.id, itemId))
        .toSQL()
      await haexhub.db.execute(deleteDetailsQuery.sql, deleteDetailsQuery.params)
    } catch (error) {
      console.error('ERROR deleteItem', error)
      throw error
    }
  } else {
    if (await createTrashIfNotExistsAsync()) {
      const updateQuery = db
        .update(haexPasswordsGroupItems)
        .set({ groupId: trashId })
        .where(eq(haexPasswordsGroupItems.itemId, itemId))
        .toSQL()
      await haexhub.db.execute(updateQuery.sql, updateQuery.params)
    }
  }
}

const deleteKeyValueAsync = async (id: string) => {
  console.log('deleteKeyValueAsync', id)
  const haexhub = useHaexHub()

  const query = db
    .delete(haexPasswordsItemKeyValues)
    .where(eq(haexPasswordsItemKeyValues.id, id))
    .toSQL()

  return await haexhub.db.execute(query.sql, query.params)
}
