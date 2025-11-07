<template>
  <UiDialogConfirm
    v-model:open="isOpen"
    :title="t('title')"
    :description="t('selectFile')"
    :confirm-label="t('import')"
    :abort-label="t('cancel')"
    :confirm-disabled="!canImport"
    confirm-icon="mdi:database-import"
    abort-icon="mdi:close"
    @confirm="importAsync"
  >
    <template #body>
      <div class="space-y-4 w-full">
        <!-- File Upload -->
        <div class="relative">
          <input
            ref="fileInput"
            type="file"
            accept=".kdbx"
            class="hidden"
            @change="onFileChangeAsync"
          />
          <UButton
            :label="selectedFileName || t('chooseFile')"
            icon="mdi:file-outline"
            color="neutral"
            variant="outline"
            class="w-full justify-start"
            @click="fileInput?.click()"
          />
        </div>

        <!-- Password Input -->
        <UiInputPassword
          v-if="fileData"
          ref="passwordInput"
          v-model="password"
          :label="t('password')"
          :placeholder="t('password')"
          class="w-full"
          @keyup.enter="canImport && importAsync()"
        />

        <!-- Import Progress -->
        <div v-if="importing" class="space-y-2">
          <UProgress v-model="progress" />
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
import * as kdbxweb from 'kdbxweb';
import { argon2id, argon2i, argon2d } from 'hash-wasm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { onStartTyping } from '@vueuse/core';
import { addBinaryAsync } from '~/utils/cleanup';
import {
  haexPasswordsItemBinaries,
  haexPasswordsItemSnapshots,
  haexPasswordsSnapshotBinaries,
  type SelectHaexPasswordsItemKeyValues,
} from '~/database/schemas';
import * as schema from '~/database/schemas';
import { getIconForKeePassIndex } from '~/utils/keepassIconMapping';

// Set argon2 implementation for kdbxweb using hash-wasm
// Argon2 types: 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
kdbxweb.CryptoEngine.argon2 = async (password: ArrayBuffer, salt: ArrayBuffer, memory: number, iterations: number, length: number, parallelism: number, type: number) => {
  console.log('[Argon2] Called with:', { memory, iterations, length, parallelism, type });

  try {
    const params = {
      password: new Uint8Array(password),
      salt: new Uint8Array(salt),
      parallelism: parallelism,
      iterations: iterations,
      memorySize: memory,
      hashLength: length,
      outputType: 'binary' as const,
    };

    console.log('[Argon2] password length:', params.password.length);
    console.log('[Argon2] salt length:', params.salt.length);

    let result: Uint8Array;

    // Select the correct Argon2 variant based on type parameter
    if (type === 0) {
      // Argon2d
      console.log('[Argon2] Using Argon2d');
      result = await argon2d(params);
    } else if (type === 1) {
      // Argon2i
      console.log('[Argon2] Using Argon2i');
      result = await argon2i(params);
    } else {
      // Argon2id (default, type === 2)
      console.log('[Argon2] Using Argon2id');
      result = await argon2id(params);
    }

    console.log('[Argon2] Result length:', result.byteLength);

    // Convert Uint8Array to ArrayBuffer (create a new copy)
    const arrayBuffer = new ArrayBuffer(result.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(result);

    console.log('[Argon2] Returning ArrayBuffer with length:', arrayBuffer.byteLength);
    return arrayBuffer;
  } catch (error) {
    console.error('[Argon2] Error:', error);
    throw error;
  }
};

const isOpen = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
const toast = useToast();

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const passwordInput = useTemplateRef("passwordInput");
const fileData = ref<ArrayBuffer | null>(null);
const selectedFileName = ref<string | null>(null);
const password = ref("");
const importing = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);

// Auto-focus password input when user starts typing (after file is selected)
onStartTyping(() => {
  if (fileData.value && passwordInput.value?.inputRef && !importing.value) {
    passwordInput.value.inputRef.focus();
  }
});

// Computed: Can import when file and password are provided
const canImport = computed(() => {
  return !!fileData.value && !!password.value && !importing.value;
});

const onFileChangeAsync = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    selectedFileName.value = null;
    return;
  }

  selectedFileName.value = file.name;

  error.value = null;
  password.value = "";

  try {
    const buffer = await file.arrayBuffer();
    fileData.value = buffer;

    // Focus password input after file is loaded
    await nextTick();

    const inputElement = passwordInput.value?.inputRef;
    if (inputElement) {
      inputElement.focus();
    }
  } catch (err) {
    error.value = t('error.parse');
    console.error(err);
  }
};

const importAsync = async () => {
  if (!fileData.value) {
    error.value = t('error.noFile');
    return;
  }

  if (!password.value) {
    error.value = t('error.noPassword');
    return;
  }

  importing.value = true;
  progress.value = 0;
  error.value = null;

  try {
    const stats = await importKdbxAsync(fileData.value, password.value);

    toast.add({
      title: t('success'),
      description: t('successDescription', {
        groups: stats.groupCount,
        entries: stats.entryCount,
      }),
      color: "success",
    });

    isOpen.value = false;
    fileData.value = null;
    password.value = "";
  } catch (err: any) {
    console.error('[KeePass Import] Error:', err);
    console.error('[KeePass Import] Error stack:', err.stack);
    console.error('[KeePass Import] Error message:', err.message);

    if (err.message?.includes('InvalidKey') || err.message?.includes('password')) {
      error.value = t('error.wrongPassword');
    } else {
      error.value = t('error.import') + ': ' + (err.message || String(err));
    }
  } finally {
    importing.value = false;
    progress.value = 0;
  }
};

// Helper function to extract field value from kdbxweb
function getFieldValue(field: kdbxweb.KdbxEntryField | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (field instanceof kdbxweb.ProtectedValue) return field.getText();
  // Fallback for any other type
  return String(field);
}

// Helper function to convert Uint8Array to Base64 (handles large files)
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
  const chunkSize = 8192; // Process 8KB at a time to avoid stack overflow
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binaryString);
}

// Helper function to extract and store icon from KeePass
async function extractIconAsync(
  kdbx: kdbxweb.Kdbx,
  item: kdbxweb.KdbxGroup | kdbxweb.KdbxEntry,
  orm: SqliteRemoteDatabase<typeof schema>
): Promise<string | null> {
  let icon: string | null = null;

  // Check for custom icon first
  if (item.customIcon && item.customIcon.id) {
    const customIconData = kdbx.meta.customIcons.get(item.customIcon.id);
    if (customIconData) {
      // Convert ArrayBuffer to Base64
      const uint8Array = new Uint8Array(customIconData.data);
      const base64 = uint8ArrayToBase64(uint8Array);

      // Store as binary and reference it
      const hash = await addBinaryAsync(orm, base64, uint8Array.length);
      icon = `binary:${hash}`;
    }
  }

  // Fallback to standard icon
  if (!icon && item.icon !== undefined && item.icon !== null) {
    const mappedIcon = getIconForKeePassIndex(item.icon);
    icon = mappedIcon;
  }

  return icon;
}

async function importKdbxAsync(buffer: ArrayBuffer, pwd: string): Promise<{ groupCount: number; entryCount: number }> {
  console.log('[KeePass Import] Starting import...');
  console.log('[KeePass Import] Buffer size:', buffer.byteLength);
  console.log('[KeePass Import] Password length:', pwd.length);

  const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(pwd));
  console.log('[KeePass Import] Credentials created, loading database...');

  const kdbx = await kdbxweb.Kdbx.load(buffer, credentials);
  console.log('[KeePass Import] Database loaded successfully');

  const { addGroupAsync } = usePasswordGroupStore();
  const { addAsync } = usePasswordItemStore();
  const { orm } = storeToRefs(useHaexHubStore());

  if (!orm.value) {
    throw new Error('Database not initialized');
  }

  // Group mapping: KeePass UUID → haex Group ID
  const groupMapping = new Map<string, string>();

  // Collect all groups
  const allGroups: Array<{ group: kdbxweb.KdbxGroup; parentUuid: string | null }> = [];

  function collectGroups(group: kdbxweb.KdbxGroup, parentUuid: string | null = null) {
    // Skip Root group
    if (group.name !== 'Root') {
      allGroups.push({ group, parentUuid });
    }

    for (const subGroup of group.groups) {
      collectGroups(subGroup, group.uuid.id);
    }
  }

  collectGroups(kdbx.getDefaultGroup());

  const allEntries = Array.from(kdbx.getDefaultGroup().allEntries());
  const totalSteps = allGroups.length + allEntries.length;
  let currentStep = 0;

  // Create groups (parent groups first)
  for (const { group, parentUuid } of allGroups) {
    const parentId = parentUuid ? groupMapping.get(parentUuid) || null : null;

    // Extract icon from KeePass
    const icon = await extractIconAsync(kdbx, group, orm.value!);

    const newGroup = await addGroupAsync({
      name: group.name,
      icon,
      parentId,
    });

    groupMapping.set(group.uuid.id, newGroup.id);
    currentStep++;
    progress.value = Math.round((currentStep / totalSteps) * 100);
  }

  // Import entries with attachments and history
  for (const entry of allEntries) {
    const groupId = entry.parentGroup ? groupMapping.get(entry.parentGroup.uuid.id) || null : null;

    // Extract fields
    const title = getFieldValue(entry.fields.get('Title'));
    const username = getFieldValue(entry.fields.get('UserName'));
    const password = getFieldValue(entry.fields.get('Password'));
    const url = getFieldValue(entry.fields.get('URL'));
    const notes = getFieldValue(entry.fields.get('Notes'));
    const tags = entry.tags?.join(', ') || null;

    // Extract OTP secret (suchen in custom fields oder notes)
    let otpSecret: string | null = null;
    const otpField = entry.fields.get('otp') || entry.fields.get('OTP');
    if (otpField) {
      otpSecret = getFieldValue(otpField) || null;
    } else if (notes && typeof notes === 'string') {
      const otpMatch = notes.match(/otpauth:\/\/totp\/[^?]+\?secret=([A-Z0-9]+)/i);
      if (otpMatch && otpMatch[1]) {
        otpSecret = otpMatch[1];
      }
    }

    // Custom fields (alle außer Standard-Felder)
    const keyValues: SelectHaexPasswordsItemKeyValues[] = [];
    const standardFields = new Set(['Title', 'UserName', 'Password', 'URL', 'Notes']);

    for (const [key, value] of entry.fields) {
      if (!standardFields.has(key) && key !== 'otp' && key !== 'OTP') {
        keyValues.push({
          id: crypto.randomUUID(),
          itemId: null,
          key,
          value: getFieldValue(value),
          updateAt: null,
        });
      }
    }

    // Extract icon from KeePass
    const icon = await extractIconAsync(kdbx, entry, orm.value!);

    const newEntryId = await addAsync(
      {
        id: crypto.randomUUID(),
        title,
        username,
        password,
        url,
        note: notes,
        otpSecret,
        icon,
        tags,
        createdAt: entry.times.creationTime ? new Date(entry.times.creationTime).toISOString() : null,
        updateAt: entry.times.lastModTime ? new Date(entry.times.lastModTime) : null,
      },
      keyValues,
      groupId ? { id: groupId, name: null, description: null, icon: null, color: null, parentId: null, order: null, createdAt: null, updateAt: null } : null
    );

    // Attachments importieren
    for (const [fileName, binary] of entry.binaries) {
      console.log(`[KeePass Import] Processing binary: ${fileName}`);
      console.log(`[KeePass Import] Binary object:`, binary);

      // Use getBinary() to get the actual binary data from the ProtectedValue
      let uint8Array: Uint8Array;
      if (binary instanceof kdbxweb.ProtectedValue) {
        console.log(`[KeePass Import] Binary is ProtectedValue, calling getBinary()`);
        uint8Array = binary.getBinary();
      } else if ((binary as any).value instanceof kdbxweb.ProtectedValue) {
        console.log(`[KeePass Import] Binary.value is ProtectedValue, calling getBinary()`);
        uint8Array = ((binary as any).value as kdbxweb.ProtectedValue).getBinary();
      } else {
        console.log(`[KeePass Import] Binary is not ProtectedValue, using as is`);
        const binaryValue = (binary as any).value || binary;
        uint8Array = new Uint8Array(binaryValue);
      }

      console.log(`[KeePass Import] Uint8Array:`, uint8Array);
      console.log(`[KeePass Import] Uint8Array length:`, uint8Array.length);

      // Skip empty binaries
      if (uint8Array.length === 0) {
        console.warn(`[KeePass Import] Skipping empty binary: ${fileName}`);
        continue;
      }

      // Convert to Base64
      const base64 = uint8ArrayToBase64(uint8Array);

      // Binary hinzufügen (dedupliziert via Hash)
      const hash = await addBinaryAsync(orm.value!, base64, uint8Array.length);

      // Entry → Binary Mapping
      await orm.value!.insert(haexPasswordsItemBinaries).values({
        id: crypto.randomUUID(),
        itemId: newEntryId,
        binaryHash: hash,
        fileName,
      });
    }

    // Entry History importieren
    for (const historyEntry of entry.history) {
      const snapshotData = {
        title: getFieldValue(historyEntry.fields.get('Title')),
        username: getFieldValue(historyEntry.fields.get('UserName')),
        password: getFieldValue(historyEntry.fields.get('Password')),
        url: getFieldValue(historyEntry.fields.get('URL')),
        note: getFieldValue(historyEntry.fields.get('Notes')),
        tags: historyEntry.tags?.join(', ') || null,
        otpSecret: null,
        keyValues: [] as any[],
      };

      // Custom fields in Snapshot
      for (const [key, value] of historyEntry.fields) {
        if (!standardFields.has(key)) {
          snapshotData.keyValues.push({
            key,
            value: getFieldValue(value),
          });
        }
      }

      const snapshot = await orm.value!.insert(haexPasswordsItemSnapshots).values({
        id: crypto.randomUUID(),
        itemId: newEntryId,
        snapshotData: JSON.stringify(snapshotData),
        createdAt: historyEntry.times.creationTime ? new Date(historyEntry.times.creationTime).toISOString() : null,
        modifiedAt: historyEntry.times.lastModTime ? new Date(historyEntry.times.lastModTime).toISOString() : null,
      }).returning();

      // History Attachments
      if (snapshot && snapshot[0]) {
        for (const [fileName, binary] of historyEntry.binaries) {
          // Use getBinary() to get the actual binary data from the ProtectedValue
          let uint8Array: Uint8Array;
          if (binary instanceof kdbxweb.ProtectedValue) {
            uint8Array = binary.getBinary();
          } else if ((binary as any).value instanceof kdbxweb.ProtectedValue) {
            uint8Array = ((binary as any).value as kdbxweb.ProtectedValue).getBinary();
          } else {
            const binaryValue = (binary as any).value || binary;
            uint8Array = new Uint8Array(binaryValue);
          }

          // Skip empty binaries
          if (uint8Array.length === 0) {
            console.warn(`[KeePass Import] Skipping empty history binary: ${fileName}`);
            continue;
          }

          // Convert to Base64
          const base64 = uint8ArrayToBase64(uint8Array);

          const hash = await addBinaryAsync(orm.value!, base64, uint8Array.length);

          await orm.value!.insert(haexPasswordsSnapshotBinaries).values({
            id: crypto.randomUUID(),
            snapshotId: snapshot[0].id,
            binaryHash: hash,
            fileName,
          });
        }
      }
    }

    currentStep++;
    progress.value = Math.round((currentStep / totalSteps) * 100);
  }

  // Sync data
  const { syncGroupItemsAsync } = usePasswordGroupStore();
  await syncGroupItemsAsync();

  return {
    groupCount: allGroups.length,
    entryCount: allEntries.length,
  };
}
</script>

<i18n lang="yaml">
de:
  title: KeePass Import
  selectFile: KeePass-Datei auswählen (.kdbx)
  chooseFile: Datei auswählen
  password: Master-Passwort
  passwordPlaceholder: Gib dein KeePass Master-Passwort ein
  import: Importieren
  cancel: Abbrechen
  importing: Importiere
  error:
    parse: Fehler beim Lesen der Datei
    wrongPassword: Falsches Passwort
    noFile: Keine Datei ausgewählt
    noPassword: Bitte Master-Passwort eingeben
    import: Fehler beim Importieren
  success: Import erfolgreich
  successDescription: "{groups} Gruppen und {entries} Einträge wurden importiert"

en:
  title: KeePass Import
  selectFile: Select KeePass file (.kdbx)
  chooseFile: Choose file
  password: Master Password
  passwordPlaceholder: Enter your KeePass master password
  import: Import
  cancel: Cancel
  importing: Importing
  error:
    parse: Error reading file
    wrongPassword: Wrong password
    noFile: No file selected
    noPassword: Please enter master password
    import: Error importing data
  success: Import successful
  successDescription: "{groups} groups and {entries} entries imported"
</i18n>
