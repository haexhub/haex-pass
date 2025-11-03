<template>
  <div class="sticky top-0 z-20 bg-background border-b border-border p-4">
    <div class="flex items-center gap-2">
      <!-- Search -->
      <UiInput
        v-model="search"
        :placeholder="t('search')"
        leading-icon="mdi:magnify"
        class="flex-1"
      />

      <!-- Sort -->
      <UDropdownMenu :items="sortOptions" class="shrink-0">
        <UButton
          icon="mdi:sort"
          :tooltip="t('sort')"
          variant="outline"
          color="neutral"
        />
      </UDropdownMenu>

      <!-- Import -->
      <UButton
        icon="mdi:database-import"
        :tooltip="t('import')"
        variant="outline"
        color="neutral"
        @click="showImportDialog = true"
      />
    </div>

    <!-- Import Dialog -->
    <PassDialogImportKeepass v-model:open="showImportDialog" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { search } = storeToRefs(useSearchStore());

const showImportDialog = ref(false);

const sortOptions = computed(() => [
  [
    {
      label: t('sortBy.name'),
      icon: 'mdi:sort-alphabetical-ascending',
      onSelect: () => {
        // TODO: Implement sorting
        console.log('Sort by name');
      },
    },
    {
      label: t('sortBy.dateCreated'),
      icon: 'mdi:sort-calendar-ascending',
      onSelect: () => {
        // TODO: Implement sorting
        console.log('Sort by date');
      },
    },
    {
      label: t('sortBy.dateModified'),
      icon: 'mdi:sort-clock-ascending',
      onSelect: () => {
        // TODO: Implement sorting
        console.log('Sort by modified');
      },
    },
  ],
]);
</script>

<i18n lang="yaml">
de:
  search: Suchen...
  sort: Sortieren
  import: Importieren
  sortBy:
    name: Nach Name
    dateCreated: Nach Erstelldatum
    dateModified: Nach Änderungsdatum

en:
  search: Search...
  sort: Sort
  import: Import
  sortBy:
    name: By name
    dateCreated: By date created
    dateModified: By date modified
</i18n>
