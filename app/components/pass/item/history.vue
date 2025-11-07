<template>
  <div class="flex gap-4 h-full">
    <!-- Left: Scrollable Timeline List -->
    <div class="w-12 sm:w-64 shrink-0 overflow-y-auto pr-2">
      <UTimeline v-if="snapshots.length" :items="timelineItems">
        <template #indicator="{ item }">
          <UButton
            icon="mdi-history"
            @click="selectedSnapshot = item.snapshot"
            :variant="selectedSnapshot === item.snapshot ? 'solid' : 'ghost'"
          />
        </template>
        <template #title="{ item }">
          <div
            class="hidden sm:block rounded-lg p-2 transition-colors cursor-pointer -ml-2"
            :class="[
              selectedSnapshot?.id === item.id
                ? 'bg-primary/10'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
            ]"
            @click="selectedSnapshot = item.snapshot"
          >
            <h3 class="font-medium text-sm truncate">
              {{ item.title }}
            </h3>
          </div>
          <!-- Small screen: just clickable area -->
          <div
            class="sm:hidden rounded-lg p-1 transition-colors cursor-pointer -ml-2"
            :class="[
              selectedSnapshot?.id === item.id
                ? 'bg-primary/10'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
            ]"
            @click="selectedSnapshot = item.snapshot"
          >
            &nbsp;
          </div>
        </template>

        <template #description="{ item }">
          <div
            class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 -ml-2 pl-2 cursor-pointer"
            @click="selectedSnapshot = item.snapshot"
          >
            {{ item.description }}
          </div>
        </template>
      </UTimeline>

      <!-- No History Message -->
      <div v-if="!snapshots.length" class="text-center text-dimmed py-8">
        {{ t("noHistory") }}
      </div>
    </div>

    <!-- Right: Sticky Snapshot Detail -->
    <div class="flex-1 sticky top-0 overflow-y-auto">
      <div v-if="selectedSnapshot" class="flex flex-col gap-4 p-4">
        <div>
          <p
            v-if="selectedSnapshot.modifiedAt"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            {{ t("modified") }}:
            {{ formatDate(selectedSnapshot.modifiedAt) }}
          </p>
        </div>

        <div v-if="parsedSnapshotData" class="flex flex-col gap-4">
          <UiInput
            v-if="parsedSnapshotData.title"
            :model-value="parsedSnapshotData.title"
            :label="t('title')"
            read-only
            with-copy-button
          />

          <UiInput
            v-if="parsedSnapshotData.username"
            :model-value="parsedSnapshotData.username"
            :label="t('username')"
            read-only
            with-copy-button
          />

          <UiInputPassword
            v-if="parsedSnapshotData.password"
            :model-value="parsedSnapshotData.password"
            read-only
            with-copy-button
          />

          <UiInput
            v-if="parsedSnapshotData.url"
            :model-value="parsedSnapshotData.url"
            :label="t('url')"
            read-only
            with-copy-button
          />

          <UiTextarea
            v-if="parsedSnapshotData.note"
            :model-value="parsedSnapshotData.note"
            :label="t('note')"
            read-only
            with-copy-button
          />

          <UiInput
            v-if="parsedSnapshotData.tags"
            :model-value="parsedSnapshotData.tags"
            :label="t('tags')"
            read-only
            with-copy-button
          />

          <div v-if="parsedSnapshotData.keyValues?.length" class="space-y-3">
            <h3 class="text-sm font-semibold">{{ t("customFields") }}</h3>
            <div
              v-for="(kv, index) in parsedSnapshotData.keyValues"
              :key="index"
              class="px-2 pt-3 pb-2 rounded-lg border border-gray-200 dark:border-gray-700 gap-3 grid grid-cols-1 sm:grid-cols-2"
            >
              <UiInput
                :model-value="kv.key"
                :label="t('key')"
                read-only
                with-copy-button
              />
              <UiInput
                :model-value="kv.value"
                :label="t('value')"
                read-only
                with-copy-button
              />
            </div>
          </div>
        </div>
      </div>

      <!-- No Snapshot Selected -->
      <div v-else class="text-center text-dimmed py-8">
        {{ t("selectSnapshot") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
import type { SelectHaexPasswordsItemSnapshots } from "~/database";

interface SnapshotData {
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  note?: string;
  tags?: string;
  otpSecret?: string | null;
  keyValues?: Array<{ key: string; value: string }>;
}

const snapshots = defineModel<SelectHaexPasswordsItemSnapshots[]>({
  default: [],
});

const { t, locale } = useI18n();

const selectedSnapshot = ref<SelectHaexPasswordsItemSnapshots | null>(null);

// Sort snapshots by date (newest first)
const sortedSnapshots = computed(() => {
  return [...snapshots.value].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
});

// Create timeline items for UTimeline component
const timelineItems = computed(() => {
  return sortedSnapshots.value.map((snapshot) => ({
    id: snapshot.id,
    snapshot: snapshot,
    title: formatRelativeDate(snapshot.createdAt),
    description: formatSnapshotSize(snapshot.snapshotData),
    icon: "i-heroicons-clock",
    color: selectedSnapshot.value?.id === snapshot.id ? "primary" : "gray",
  }));
});

// Auto-select first snapshot when list changes
watch(
  sortedSnapshots,
  (newSnapshots) => {
    if (newSnapshots.length > 0 && !selectedSnapshot.value) {
      selectedSnapshot.value = newSnapshots[0] ?? null;
    }
  },
  { immediate: true }
);

const parsedSnapshotData = computed<SnapshotData | null>(() => {
  if (!selectedSnapshot.value?.snapshotData) return null;

  try {
    return JSON.parse(selectedSnapshot.value.snapshotData) as SnapshotData;
  } catch {
    return null;
  }
});

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return t("unknown");

  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return t("unknown");
  }
}

function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return t("unknown");

  try {
    // useTimeAgo has English built-in, only provide German translations
    const timeAgo = useTimeAgo(new Date(dateString), {
      messages:
        locale.value === "de"
          ? {
              justNow: "gerade eben",
              past: "vor {0}",
              future: "in {0}",
              second: (n: number) =>
                n === 1 ? "einer Sekunde" : `${n} Sekunden`,
              minute: (n: number) =>
                n === 1 ? "einer Minute" : `${n} Minuten`,
              hour: (n: number) => (n === 1 ? "einer Stunde" : `${n} Stunden`),
              day: (n: number) => (n === 1 ? "einem Tag" : `${n} Tagen`),
              week: (n: number) => (n === 1 ? "einer Woche" : `${n} Wochen`),
              month: (n: number) => (n === 1 ? "einem Monat" : `${n} Monaten`),
              year: (n: number) => (n === 1 ? "einem Jahr" : `${n} Jahren`),
              invalid: "",
            }
          : undefined, // undefined = use built-in English messages
    });
    return timeAgo.value;
  } catch {
    return t("unknown");
  }
}

function formatSnapshotSize(snapshotData: string | null): string {
  if (!snapshotData) return "0 B";

  const bytes = new Blob([snapshotData]).size;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
</script>

<i18n lang="json">
{
  "de": {
    "noHistory": "Keine Versionshistorie vorhanden",
    "snapshotDescription": "Gespeicherter Zustand",
    "selectSnapshot": "Wähle einen Snapshot aus der Liste",
    "modified": "geändert am",
    "unknown": "Unbekannt",
    "title": "Titel",
    "username": "Nutzername",
    "password": "Passwort",
    "url": "URL",
    "note": "Notiz",
    "tags": "Tags",
    "customFields": "Benutzerdefinierte Felder",
    "key": "Schlüssel",
    "value": "Wert"
  },
  "en": {
    "noHistory": "No version history available",
    "snapshotDescription": "Saved state",
    "selectSnapshot": "Select a snapshot from the list",
    "modified": "modified at",
    "unknown": "Unknown",
    "title": "Title",
    "username": "Username",
    "password": "Password",
    "url": "URL",
    "note": "Note",
    "tags": "Tags",
    "customFields": "Custom Fields",
    "key": "Key",
    "value": "Value"
  }
}
</i18n>
