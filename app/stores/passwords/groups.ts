import { computedAsync } from "@vueuse/core";
import { eq, isNull, sql } from "drizzle-orm";
import type { IPasswordMenuItem } from "~/components/pass/mobile/menu/types";

import {
  haexPasswordsGroupItems,
  haexPasswordsGroups,
  type InsertHaexPasswordsGroups,
  type SelectHaexPasswordsGroupItems,
  type SelectHaexPasswordsGroups,
} from "~/database/schemas";
import { getSingleRouteParam } from "~/utils/helper";
import { usePasswordItemStore } from "./items";

export const trashId = "trash";

export const usePasswordGroupStore = defineStore("passwordGroupStore", () => {
  const groups = ref<SelectHaexPasswordsGroups[]>([]);

  const currentGroupId = computed<string | null | undefined>({
    get: () =>
      getSingleRouteParam(useRouter().currentRoute.value.params.groupId) ||
      undefined,
    set: (newGroupId) => {
      console.log("set groupId", newGroupId);
      useRouter().currentRoute.value.params.groupId = newGroupId ?? "";
    },
  });

  const currentGroup = computedAsync(() =>
    currentGroupId.value ? readGroupAsync(currentGroupId.value) : null
  );

  const selectedGroupItems = ref<IPasswordMenuItem[]>();

  const breadCrumbs = computed(() => getParentChain(currentGroupId.value));

  const getParentChain = (
    groupId?: string | null,
    chain: SelectHaexPasswordsGroups[] = []
  ) => {
    const group = groups.value.find((group) => group.id === groupId);
    console.log("getParentChain1: found group", group, chain);
    /* if (group) {
      chain.push(group)
      console.log('getParentChain: found group', group, chain)
      return getParentChain(group.parentId, chain)
    }

    return chain.reverse() */
    return [];
  };

  const syncGroupItemsAsync = async () => {
    const { syncItemsAsync } = usePasswordItemStore();

    groups.value = (await readGroupsAsync()) ?? [];
    await syncItemsAsync();
    /* currentGroup.value = groups.value?.find(
      (group) => group.id === currentGroupId.value,
    )

    try {
      currentGroupItems.groups =
        (await getByParentIdAsync(currentGroupId)) ?? []
      currentGroupItems.items = (await readByGroupIdAsync(currentGroupId)) ?? []
    } catch (error) {
      console.error(error)
      currentGroupItems.groups = []
      currentGroupItems.items = []
      await addNotificationAsync({
        type: 'log',
        text: JSON.stringify(error),
      })
    } */
  };

  watch(currentGroupId, () => syncGroupItemsAsync(), {
    immediate: true,
  });

  const inTrashGroup = computed(() =>
    breadCrumbs.value?.some((item) => item.id === trashId)
  );

  return {
    addGroupAsync,
    areGroupsEqual,
    breadCrumbs,
    createTrashIfNotExistsAsync,
    currentGroup,
    currentGroupId,
    // currentGroupItems,
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
  };
});

const addGroupAsync = async (group: Partial<InsertHaexPasswordsGroups>) => {
  const { currentVault } = useVaultStore();
  const { syncGroupItemsAsync } = usePasswordGroupStore();

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id || crypto.randomUUID(),
    parentId: group.parentId,
    color: group.color,
    icon: group.icon,
    name: group.name,
    order: group.order,
  };
  await currentVault?.drizzle?.insert(haexPasswordsGroups).values(newGroup);
  await syncGroupItemsAsync();
  return newGroup;
};

const readGroupAsync = async (groupId: string) => {
  const { currentVault } = useVaultStore();
  const group = await currentVault?.drizzle.query.haexPasswordsGroups.findFirst(
    {
      where: eq(haexPasswordsGroups.id, groupId),
    }
  );
  console.log("readGroupAsync", groupId, group);
  return group;
};

const readGroupsAsync = async (filter?: { parentId?: string | null }) => {
  const { currentVault } = useVaultStore();
  if (filter?.parentId) {
    return await currentVault?.drizzle
      .select()
      .from(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.id, filter.parentId));
  } else {
    return await currentVault?.drizzle
      .select()
      .from(haexPasswordsGroups)
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`);
  }
};

const readGroupItemsAsync = async (
  groupId?: string | null
): Promise<SelectHaexPasswordsGroupItems[]> => {
  const { currentVault } = useVaultStore();

  if (groupId) {
    return (
      currentVault?.drizzle
        ?.select()
        .from(haexPasswordsGroupItems)
        .where(eq(haexPasswordsGroupItems.groupId, groupId)) ?? []
    );
  } else {
    return (
      currentVault?.drizzle
        ?.select()
        .from(haexPasswordsGroupItems)
        .where(isNull(haexPasswordsGroupItems.groupId)) ?? []
    );
  }
};

const getChildGroupsRecursiveAsync = async (
  groupId: string,
  groups: SelectHaexPasswordsGroups[] = []
) => {
  const childGroups = (await getByParentIdAsync(groupId)) ?? [];
  for (const child of childGroups) {
    groups.push(...(await getChildGroupsRecursiveAsync(child.id)));
  }

  return groups;
};

const getByParentIdAsync = async (
  parentId?: string | null
): Promise<SelectHaexPasswordsGroups[]> => {
  try {
    const { currentVault } = useVaultStore();

    console.log("getByParentIdAsync", parentId);
    if (parentId) {
      const groups = await currentVault?.drizzle
        ?.select()
        .from(haexPasswordsGroups)
        .where(eq(haexPasswordsGroups.parentId, parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`);

      return groups ?? [];
    } else {
      const groups = await currentVault?.drizzle
        ?.select()
        .from(haexPasswordsGroups)
        .where(isNull(haexPasswordsGroups.parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`);

      return groups ?? [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
};

const navigateToGroupAsync = (groupId?: string | null) =>
  navigateTo(
    useLocaleRoute()({
      name: "passwordGroupEdit",
      params: {
        vaultId: useRouter().currentRoute.value.params.vaultId,
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  );

const updateAsync = async (group: InsertHaexPasswordsGroups) => {
  console.log("updateAsync", group);
  const { currentVault } = useVaultStore();
  if (!group.id) return;

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id,
    color: group.color,
    description: group.description,
    icon: group.icon,
    name: group.name,
    order: group.order,
    parentId: group.parentId,
  };

  return currentVault?.drizzle
    .update(haexPasswordsGroups)
    .set(newGroup)
    .where(eq(haexPasswordsGroups.id, newGroup.id));
};

const navigateToGroupItemsAsync = (groupId: string) => {
  return navigateTo(
    useLocaleRoute()({
      name: "passwordGroupItems",
      params: {
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  );
};

const insertGroupItemsAsync = async (
  items: IPasswordMenuItem[],
  groupdId?: string | null
) => {
  const { currentVault } = useVaultStore();
  const { groups } = usePasswordGroupStore();
  const { syncGroupItemsAsync } = usePasswordGroupStore();

  const targetGroup = groups.find((group) => group.id === groupdId);

  for (const item of items) {
    if (item.type === "group") {
      const updateGroup = groups.find((group) => group.id === item.id);

      if (updateGroup?.parentId === targetGroup?.id) return;

      if (updateGroup) {
        updateGroup.parentId = targetGroup?.id ?? null;
        await currentVault?.drizzle
          .update(haexPasswordsGroups)
          .set(updateGroup)
          .where(eq(haexPasswordsGroups.id, updateGroup.id));
      }
    } else {
      if (targetGroup)
        await currentVault?.drizzle
          .update(haexPasswordsGroupItems)
          .set({ groupId: targetGroup.id, itemId: item.id })
          .where(eq(haexPasswordsGroupItems.itemId, item.id));
    }
  }
  return syncGroupItemsAsync();
};

const createTrashIfNotExistsAsync = async () => {
  const exists = await readGroupAsync(trashId);
  console.log("found trash", exists);
  if (exists) return true;

  return addGroupAsync({
    name: "Trash",
    id: trashId,
    icon: "mdi:trash-outline",
    parentId: null,
  });
};

const deleteGroupAsync = async (groupId: string, final: boolean = false) => {
  const { currentVault } = useVaultStore();
  const { readByGroupIdAsync, deleteAsync } = usePasswordItemStore();

  console.log("deleteGroupAsync", groupId, final);

  if (final || groupId === trashId) {
    const childGroups = await getByParentIdAsync(groupId);

    for (const child of childGroups) {
      await deleteGroupAsync(child.id, true);
    }

    const items = (await readByGroupIdAsync(groupId)) ?? [];
    console.log("deleteGroupAsync delete Items", items);
    for (const item of items) {
      if (item) await deleteAsync(item.id, true);
    }

    return await currentVault?.drizzle
      .delete(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.id, groupId));
  } else {
    if (await createTrashIfNotExistsAsync())
      await updateAsync({ id: groupId, parentId: trashId });
  }
};

const areGroupsEqual = (
  groupA: unknown | unknown[] | null,
  groupB: unknown | unknown[] | null
) => {
  if (groupA === null && groupB === null) return true;

  if (Array.isArray(groupA) && Array.isArray(groupB)) {
    console.log("compare object arrays", groupA, groupB);
    if (groupA.length === groupB.length) return true;

    return groupA.some((group, index) => {
      return areObjectsEqual(group, groupA[index]);
    });
  }
  return areObjectsEqual(groupA, groupB);
};
