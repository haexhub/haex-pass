<template>
  <ul class="flex items-center gap-2 px-7 pt-3">
    <li>
      <NuxtLinkLocale
        :to="{ name: 'passwordGroupItems' }"
        class="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Icon name="mdi:safe" size="24" />
      </NuxtLinkLocale>
    </li>

    <li v-for="item in items" :key="item.id" class="flex items-center gap-2">
      <Icon name="tabler:chevron-right" class="rtl:rotate-180" />
      <NuxtLinkLocale
        :to="{ name: 'passwordGroupItems', params: { groupId: item.id } }"
        class="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {{ item.name }}
      </NuxtLinkLocale>
    </li>

    <li v-if="lastGroup" class="ml-2">
      <UTooltip :text="t('edit')">
        <NuxtLinkLocale
          :to="{
            name: 'passwordGroupEdit',
            params: { groupId: lastGroup.id },
          }"
          class="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Icon name="mdi:pencil" />
        </NuxtLinkLocale>
      </UTooltip>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { SelectHaexPasswordsGroups } from "~/database";

const groups = defineProps<{ items: SelectHaexPasswordsGroups[] }>();

const lastGroup = computed(() => groups.items.at(-1));

const { t } = useI18n();
</script>

<i18n lang="yaml">
de:
  edit: Bearbeiten

en:
  edit: Edit
</i18n>
