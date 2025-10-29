import { eq, isNull, sql } from 'drizzle-orm'
import type { IPasswordMenuItem } from '~/components/pass/mobile/menu/types'

import { db } from '~/database'
import {
  haexPasswordsGroupItems,
  haexPasswordsGroups,
  type InsertHaexPasswordsGroups,
  type SelectHaexPasswordsGroupItems,
  type SelectHaexPasswordsGroups,
} from '~/database/schemas'
import { getSingleRouteParam } from '~/utils/helper'
import { usePasswordItemStore } from './items'

export const trashId = 'trash'

export const usePasswordGroupStore = defineStore('passwordGroupStore', () => {
  const groups = ref<SelectHaexPasswordsGroups[]>([])

  const currentGroupId = computed<string | null | undefined>({
    get: () =>
      getSingleRouteParam(useRouter().currentRoute.value.params.groupId) ||
      undefined,
    set: (newGroupId) => {
      console.log('set groupId', newGroupId)
      useRouter().currentRoute.value.params.groupId = newGroupId ?? ''
    },
  })

  const currentGroup = ref<SelectHaexPasswordsGroups | null>(null)

  // Watch currentGroupId and update currentGroup
  watch(
    currentGroupId,
    async (newId) => {
      if (newId) {
        currentGroup.value = await readGroupAsync(newId)
      } else {
        currentGroup.value = null
      }
    },
    { immediate: true }
  )

  const selectedGroupItems = ref<IPasswordMenuItem[]>()

  const breadCrumbs = computed(() => getParentChain(currentGroupId.value))

  const getParentChain = (
    groupId?: string | null,
    chain: SelectHaexPasswordsGroups[] = []
  ) => {
    const group = groups.value.find((group) => group.id === groupId)
    if (group) {
      chain.unshift(group)
      return getParentChain(group.parentId, chain)
    }
    return chain
  }

  const syncGroupItemsAsync = async () => {
    const { syncItemsAsync } = usePasswordItemStore()

    groups.value = (await readGroupsAsync()) ?? []
    await syncItemsAsync()
  }

  watch(currentGroupId, () => syncGroupItemsAsync(), {
    immediate: true,
  })

  const inTrashGroup = computed(() =>
    breadCrumbs.value?.some((item) => item.id === trashId)
  )

  return {
    addGroupAsync,
    areGroupsEqual,
    breadCrumbs,
    createTrashIfNotExistsAsync,
    currentGroup,
    currentGroupId,
    deleteGroupAsync,
    getChildGroupsRecursiveAsync,
    groups,
    inTrashGroup,
    insertGroupItemsAsync,
    navigateToGroupAsync,
    navigateToGroupItemsAsync,
    readGroupAsync,
    readGroupItemsAsync,
    readGroupsAsync,
    selectedGroupItems,
    syncGroupItemsAsync,
    trashId,
    updateAsync,
  }
})

const addGroupAsync = async (group: Partial<InsertHaexPasswordsGroups>) => {
  const haexhub = useHaexHub()

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id || crypto.randomUUID(),
    parentId: group.parentId,
    color: group.color,
    icon: group.icon,
    name: group.name,
    order: group.order,
  }

  const query = db.insert(haexPasswordsGroups).values(newGroup).toSQL()
  await haexhub.db.execute(query.sql, query.params)

  return newGroup
}

const readGroupAsync = async (groupId: string) => {
  const haexhub = useHaexHub()

  const query = db
    .select()
    .from(haexPasswordsGroups)
    .where(eq(haexPasswordsGroups.id, groupId))
    .limit(1)
    .toSQL()

  const result = await haexhub.db.query<SelectHaexPasswordsGroups>(
    query.sql,
    query.params
  )

  return result[0] || null
}

const readGroupsAsync = async (filter?: { parentId?: string | null }) => {
  const haexhub = useHaexHub()

  let query
  if (filter?.parentId) {
    query = db
      .select()
      .from(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.parentId, filter.parentId))
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
      .toSQL()
  } else {
    query = db
      .select()
      .from(haexPasswordsGroups)
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
      .toSQL()
  }

  return await haexhub.db.query<SelectHaexPasswordsGroups>(
    query.sql,
    query.params
  )
}

const readGroupItemsAsync = async (
  groupId?: string | null
): Promise<SelectHaexPasswordsGroupItems[]> => {
  const haexhub = useHaexHub()

  let query
  if (groupId) {
    query = db
      .select()
      .from(haexPasswordsGroupItems)
      .where(eq(haexPasswordsGroupItems.groupId, groupId))
      .toSQL()
  } else {
    query = db
      .select()
      .from(haexPasswordsGroupItems)
      .where(isNull(haexPasswordsGroupItems.groupId))
      .toSQL()
  }

  return await haexhub.db.query<SelectHaexPasswordsGroupItems>(
    query.sql,
    query.params
  )
}

const getChildGroupsRecursiveAsync = async (
  groupId: string,
  groups: SelectHaexPasswordsGroups[] = []
) => {
  const childGroups = (await getByParentIdAsync(groupId)) ?? []
  for (const child of childGroups) {
    groups.push(...(await getChildGroupsRecursiveAsync(child.id)))
  }

  return groups
}

const getByParentIdAsync = async (
  parentId?: string | null
): Promise<SelectHaexPasswordsGroups[]> => {
  try {
    const haexhub = useHaexHub()

    console.log('getByParentIdAsync', parentId)
    let query
    if (parentId) {
      query = db
        .select()
        .from(haexPasswordsGroups)
        .where(eq(haexPasswordsGroups.parentId, parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
        .toSQL()
    } else {
      query = db
        .select()
        .from(haexPasswordsGroups)
        .where(isNull(haexPasswordsGroups.parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
        .toSQL()
    }

    return await haexhub.db.query<SelectHaexPasswordsGroups>(
      query.sql,
      query.params
    )
  } catch (error) {
    console.error(error)
    return []
  }
}

const navigateToGroupAsync = (groupId?: string | null) =>
  navigateTo(
    useLocaleRoute()({
      name: 'passwordGroupEdit',
      params: {
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  )

const updateAsync = async (group: InsertHaexPasswordsGroups) => {
  console.log('updateAsync', group)
  const haexhub = useHaexHub()
  if (!group.id) return

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id,
    color: group.color,
    description: group.description,
    icon: group.icon,
    name: group.name,
    order: group.order,
    parentId: group.parentId,
  }

  const query = db
    .update(haexPasswordsGroups)
    .set(newGroup)
    .where(eq(haexPasswordsGroups.id, newGroup.id))
    .toSQL()

  return await haexhub.db.execute(query.sql, query.params)
}

const navigateToGroupItemsAsync = (groupId: string) => {
  return navigateTo(
    useLocaleRoute()({
      name: 'passwordGroupItems',
      params: {
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  )
}

const insertGroupItemsAsync = async (
  items: IPasswordMenuItem[],
  groupdId?: string | null
) => {
  const haexhub = useHaexHub()
  const { groups } = usePasswordGroupStore()
  const { syncGroupItemsAsync } = usePasswordGroupStore()

  const targetGroup = groups.find((group) => group.id === groupdId)

  for (const item of items) {
    if (item.type === 'group') {
      const updateGroup = groups.find((group) => group.id === item.id)

      if (updateGroup?.parentId === targetGroup?.id) return

      if (updateGroup) {
        updateGroup.parentId = targetGroup?.id ?? null
        const query = db
          .update(haexPasswordsGroups)
          .set(updateGroup)
          .where(eq(haexPasswordsGroups.id, updateGroup.id))
          .toSQL()
        await haexhub.db.execute(query.sql, query.params)
      }
    } else {
      if (targetGroup) {
        const query = db
          .update(haexPasswordsGroupItems)
          .set({ groupId: targetGroup.id, itemId: item.id })
          .where(eq(haexPasswordsGroupItems.itemId, item.id))
          .toSQL()
        await haexhub.db.execute(query.sql, query.params)
      }
    }
  }
  return syncGroupItemsAsync()
}

const createTrashIfNotExistsAsync = async () => {
  const exists = await readGroupAsync(trashId)
  console.log('found trash', exists)
  if (exists) return true

  return addGroupAsync({
    name: 'Trash',
    id: trashId,
    icon: 'mdi:trash-outline',
    parentId: null,
  })
}

const deleteGroupAsync = async (groupId: string, final: boolean = false) => {
  const haexhub = useHaexHub()
  const { readByGroupIdAsync, deleteAsync } = usePasswordItemStore()

  console.log('deleteGroupAsync', groupId, final)

  if (final || groupId === trashId) {
    const childGroups = await getByParentIdAsync(groupId)

    for (const child of childGroups) {
      await deleteGroupAsync(child.id, true)
    }

    const items = (await readByGroupIdAsync(groupId)) ?? []
    console.log('deleteGroupAsync delete Items', items)
    for (const item of items) {
      if (item) await deleteAsync(item.id, true)
    }

    const query = db
      .delete(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.id, groupId))
      .toSQL()

    return await haexhub.db.execute(query.sql, query.params)
  } else {
    if (await createTrashIfNotExistsAsync())
      await updateAsync({ id: groupId, parentId: trashId })
  }
}

const areGroupsEqual = (
  groupA: unknown | unknown[] | null,
  groupB: unknown | unknown[] | null
) => {
  if (groupA === null && groupB === null) return true

  if (Array.isArray(groupA) && Array.isArray(groupB)) {
    console.log('compare object arrays', groupA, groupB)
    if (groupA.length === groupB.length) return true

    return groupA.some((group: unknown, index: number) => {
      return areObjectsEqual(group, groupA[index])
    })
  }
  return areObjectsEqual(groupA, groupB)
}

// Helper function for object comparison
function areObjectsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)

  if (keysA.length !== keysB.length) return false

  return keysA.every((key) => {
    const valA = (a as Record<string, unknown>)[key]
    const valB = (b as Record<string, unknown>)[key]
    return valA === valB
  })
}
