import { eq, isNull, sql } from 'drizzle-orm'
import type { IPasswordMenuItem } from '~/components/pass/mobile/menu/types'

import {
  haexPasswordsGroupItems,
  haexPasswordsGroups,
  type InsertHaexPasswordsGroups,
  type SelectHaexPasswordsGroupItems,
  type SelectHaexPasswordsGroups,
} from '~/database'
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
    { immediate: false }
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
    const haexhubStore = useHaexHubStore()

    // Wait for database to be initialized
    if (!haexhubStore.orm) {
      console.log('[syncGroupItemsAsync] Database not yet initialized, skipping sync')
      return
    }

    const { syncItemsAsync } = usePasswordItemStore()

    groups.value = (await readGroupsAsync()) ?? []
    await syncItemsAsync()
  }

  // Watch for haexhub initialization and then sync
  const haexhubStore = useHaexHubStore()
  watch(() => haexhubStore.orm, (orm) => {
    if (orm) {
      console.log('[passwordGroupStore] Database initialized, syncing items')
      syncGroupItemsAsync()
    }
  }, { immediate: true })

  watch(currentGroupId, () => syncGroupItemsAsync(), {
    immediate: false,
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
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id || crypto.randomUUID(),
    parentId: group.parentId,
    color: group.color,
    icon: group.icon,
    name: group.name,
    order: group.order,
  }

  await haexhubStore.orm.insert(haexPasswordsGroups).values(newGroup)

  return newGroup
}

const readGroupAsync = async (groupId: string) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const result = await haexhubStore.orm
    .select()
    .from(haexPasswordsGroups)
    .where(eq(haexPasswordsGroups.id, groupId))
    .limit(1)

  return result[0] || null
}

const readGroupsAsync = async (filter?: { parentId?: string | null }) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  let query
  if (filter?.parentId) {
    query = haexhubStore.orm
      .select()
      .from(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.parentId, filter.parentId))
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
  } else {
    query = haexhubStore.orm
      .select()
      .from(haexPasswordsGroups)
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
  }

  return await query
}

const readGroupItemsAsync = async (
  groupId?: string | null
): Promise<SelectHaexPasswordsGroupItems[]> => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  if (groupId) {
    return await haexhubStore.orm
      .select()
      .from(haexPasswordsGroupItems)
      .where(eq(haexPasswordsGroupItems.groupId, groupId))
  } else {
    return await haexhubStore.orm
      .select()
      .from(haexPasswordsGroupItems)
      .where(isNull(haexPasswordsGroupItems.groupId))
  }
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
    const haexhubStore = useHaexHubStore()
    if (!haexhubStore.orm) throw new Error('Database not initialized')

    if (parentId) {
      return await haexhubStore.orm
        .select()
        .from(haexPasswordsGroups)
        .where(eq(haexPasswordsGroups.parentId, parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
    } else {
      return await haexhubStore.orm
        .select()
        .from(haexPasswordsGroups)
        .where(isNull(haexPasswordsGroups.parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
    }
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
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')
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

  return await haexhubStore.orm
    .update(haexPasswordsGroups)
    .set(newGroup)
    .where(eq(haexPasswordsGroups.id, newGroup.id))
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
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const { groups } = usePasswordGroupStore()
  const { syncGroupItemsAsync } = usePasswordGroupStore()

  const targetGroup = groups.find((group) => group.id === groupdId)

  for (const item of items) {
    if (item.type === 'group') {
      const updateGroup = groups.find((group) => group.id === item.id)

      if (updateGroup?.parentId === targetGroup?.id) return

      if (updateGroup) {
        updateGroup.parentId = targetGroup?.id ?? null
        await haexhubStore.orm
          .update(haexPasswordsGroups)
          .set(updateGroup)
          .where(eq(haexPasswordsGroups.id, updateGroup.id))
      }
    } else {
      if (targetGroup) {
        await haexhubStore.orm
          .update(haexPasswordsGroupItems)
          .set({ groupId: targetGroup.id, itemId: item.id })
          .where(eq(haexPasswordsGroupItems.itemId, item.id))
      }
    }
  }
  return syncGroupItemsAsync()
}

const createTrashIfNotExistsAsync = async () => {
  const exists = await readGroupAsync(trashId)
  if (exists) return true

  return addGroupAsync({
    name: 'Trash',
    id: trashId,
    icon: 'mdi:trash-outline',
    parentId: null,
  })
}

const deleteGroupAsync = async (groupId: string, final: boolean = false) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  if (final || groupId === trashId) {
    // With CASCADE DELETE in the schema, child groups and items will be automatically deleted
    return await haexhubStore.orm
      .delete(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.id, groupId))
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
