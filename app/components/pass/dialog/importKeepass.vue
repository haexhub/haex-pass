<template>
  <UiDialogConfirm
    v-model:open="isOpen"
    :title="t('title')"
    :confirm-label="t('import')"
    :abort-label="t('cancel')"
    confirm-icon="mdi:database-import"
    abort-icon="mdi:close"
    @confirm="importAsync"
  >
    <template #body>
      <div class="space-y-4 w-full">
        <!-- File Upload -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">{{ t('selectFile') }}</label>
          <input
            ref="fileInput"
            type="file"
            accept=".xml,.csv"
            class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            @change="onFileChangeAsync"
          />
        </div>

        <!-- Preview Stats -->
        <div v-if="preview" class="p-4 bg-muted rounded-lg space-y-2">
          <div class="text-sm font-medium">{{ t('preview.title') }}</div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>{{ t('preview.groups') }}:</div>
            <div class="font-semibold">{{ preview.groupCount }}</div>
            <div>{{ t('preview.entries') }}:</div>
            <div class="font-semibold">{{ preview.entryCount }}</div>
          </div>
        </div>

        <!-- Progress -->
        <div v-if="importing" class="space-y-2">
          <UProgress :value="progress" />
          <div class="text-sm text-center text-dimmed">
            {{ t('importing') }}: {{ progress }}%
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {{ error }}
        </div>
      </div>
    </template>
  </UiDialogConfirm>
</template>

<script setup lang="ts">
import { XMLParser } from 'fast-xml-parser';

const isOpen = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
const toast = useToast();

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const xmlContent = ref<string>("");
const preview = ref<{ groupCount: number; entryCount: number } | null>(null);
const importing = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);

const onFileChangeAsync = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  error.value = null;

  try {
    xmlContent.value = await file.text();
    const previewData = parseKeePassXml(xmlContent.value);
    preview.value = {
      groupCount: previewData.groups.length,
      entryCount: previewData.entries.length,
    };
  } catch (err) {
    error.value = t('error.parse');
    console.error(err);
  }
};

interface KeePassKeyValue {
  key: string;
  value: string;
}

interface KeePassEntry {
  groupPath: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string;
  otpSecret?: string;
  keyValues: KeePassKeyValue[];
}

interface KeePassGroup {
  name: string;
  path: string;
  uuid: string;
}

interface KeePassData {
  groups: KeePassGroup[];
  entries: KeePassEntry[];
}

const parseKeePassXml = (xml: string): KeePassData => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const result = parser.parse(xml);
  const groups: KeePassGroup[] = [];
  const entries: KeePassEntry[] = [];

  // Recursive function to traverse groups
  const traverseGroup = (group: any, parentPath: string = "") => {
    if (!group) return;

    const groupName = group.Name || "Unnamed";
    const groupPath = parentPath ? `${parentPath} → ${groupName}` : groupName;

    // Skip Root group in path
    const finalPath = groupName === "Root" ? "" : groupPath;

    if (groupName !== "Root") {
      groups.push({
        name: groupName,
        path: finalPath,
        uuid: group.UUID || crypto.randomUUID(),
      });
    }

    // Process entries in this group
    if (group.Entry) {
      const groupEntries = Array.isArray(group.Entry) ? group.Entry : [group.Entry];

      groupEntries.forEach((entry: any) => {
        const strings = Array.isArray(entry.String) ? entry.String : [entry.String];

        const entryData: any = {
          groupPath: finalPath || "Root",
          title: "",
          username: "",
          password: "",
          url: "",
          notes: "",
          tags: entry.Tags || "",
          keyValues: [],
        };

        strings.forEach((str: any) => {
          const key = str.Key;
          // Handle different value formats (string, object with #text, or object with Protected flag)
          let value = "";
          if (typeof str.Value === "string") {
            value = str.Value;
          } else if (str.Value?.["#text"]) {
            value = str.Value["#text"];
          } else if (str.Value && typeof str.Value === "object") {
            // Skip protected/encrypted values
            if (str.Value.Protected) {
              value = "";
            } else {
              value = String(str.Value);
            }
          }

          switch (key) {
            case "Title":
              entryData.title = value;
              break;
            case "UserName":
              entryData.username = value;
              break;
            case "Password":
              entryData.password = value;
              break;
            case "URL":
              entryData.url = value;
              break;
            case "Notes":
              entryData.notes = value;
              // Try to extract OTP secret from notes
              if (value && typeof value === "string") {
                const otpMatch = value.match(/otpauth:\/\/totp\/[^?]+\?secret=([A-Z0-9]+)/i);
                if (otpMatch) {
                  entryData.otpSecret = otpMatch[1];
                }
              }
              break;
            default:
              // Any other String field becomes a key-value pair
              if (value && typeof value === "string") {
                entryData.keyValues.push({ key, value });
              }
              break;
          }
        });

        if (entryData.title) {
          entries.push(entryData);
        }
      });
    }

    // Process nested groups
    if (group.Group) {
      const subGroups = Array.isArray(group.Group) ? group.Group : [group.Group];
      subGroups.forEach((subGroup: any) => traverseGroup(subGroup, finalPath));
    }
  };

  // Start traversal from root
  if (result.KeePassFile?.Root?.Group) {
    traverseGroup(result.KeePassFile.Root.Group);
  }

  return {
    groups,
    entries,
  };
};

const importAsync = async () => {
  if (!xmlContent.value) {
    error.value = t('error.noFile');
    return;
  }

  importing.value = true;
  progress.value = 0;
  error.value = null;

  try {
    const data = parseKeePassXml(xmlContent.value);

    const { addGroupAsync } = usePasswordGroupStore();
    const { addAsync } = usePasswordItemStore();

    // Create group mapping from full path to group ID
    const groupMapping = new Map<string, string>();

    // Parse and create groups with hierarchy
    // Sort by path depth to ensure parent groups are created first
    const sortedGroups = [...data.groups].sort((a, b) => {
      const aDepth = a.path.split(' → ').length;
      const bDepth = b.path.split(' → ').length;
      return aDepth - bDepth;
    });

    for (let i = 0; i < sortedGroups.length; i++) {
      const group = sortedGroups[i];
      if (!group) continue;

      const pathParts = group.path.split(' → ');
      const groupName = pathParts[pathParts.length - 1];

      // Find parent group ID if this is a nested group
      let parentId: string | null = null;
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join(' → ');
        parentId = groupMapping.get(parentPath) || null;
      }

      const newGroup = await addGroupAsync({
        name: groupName || 'Unnamed',
        icon: "mdi:folder-outline",
        parentId: parentId,
      });

      groupMapping.set(group.path, newGroup.id);

      progress.value = Math.round(((i + 1) / (sortedGroups.length + data.entries.length)) * 100);
    }

    // Import entries
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i];
      if (!entry) continue;

      const groupId = groupMapping.get(entry.groupPath) || null;

      await addAsync(
        {
          id: crypto.randomUUID(),
          title: entry.title,
          username: entry.username,
          password: entry.password,
          url: entry.url,
          note: entry.notes,
          otpSecret: entry.otpSecret || null,
          icon: null,
          tags: entry.tags || null,
          createdAt: null,
          updateAt: null,
        },
        entry.keyValues.map((kv) => ({
          id: crypto.randomUUID(),
          key: kv.key,
          value: kv.value,
          itemId: null,
          updateAt: null,
        })),
        groupId ? { id: groupId, name: null, description: null, icon: null, color: null, parentId: null, order: null, createdAt: null, updateAt: null } : null
      );

      progress.value = Math.round(
        ((sortedGroups.length + i + 1) / (sortedGroups.length + data.entries.length)) * 100
      );
    }

    // Sync data
    const { syncGroupItemsAsync } = usePasswordGroupStore();
    await syncGroupItemsAsync();

    toast.add({
      title: t('success'),
      description: t('successDescription', {
        groups: data.groups.length,
        entries: data.entries.length,
      }),
      color: "success",
    });

    isOpen.value = false;
    xmlContent.value = "";
    preview.value = null;
  } catch (err) {
    error.value = t('error.import');
    console.error(err);
  } finally {
    importing.value = false;
    progress.value = 0;
  }
};
</script>

<i18n lang="yaml">
de:
  title: KeePass Import
  selectFile: XML-Datei auswählen
  import: Importieren
  cancel: Abbrechen
  importing: Importiere
  preview:
    title: Vorschau
    groups: Gruppen
    entries: Einträge
  error:
    parse: Fehler beim Parsen der XML-Datei
    noFile: Keine Datei ausgewählt
    import: Fehler beim Importieren
  success: Import erfolgreich
  successDescription: "{groups} Gruppen und {entries} Einträge wurden importiert"

en:
  title: KeePass Import
  selectFile: Select XML file
  import: Import
  cancel: Cancel
  importing: Importing
  preview:
    title: Preview
    groups: Groups
    entries: Entries
  error:
    parse: Error parsing XML file
    noFile: No file selected
    import: Error importing data
  success: Import successful
  successDescription: "{groups} groups and {entries} entries imported"
</i18n>
