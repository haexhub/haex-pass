<template>
  <div class="">
    <!-- Attachment Grid -->
    <UPageGrid v-if="attachments.length || attachmentsToAdd.length">
      <UPageCard
        v-for="attachment in [...attachments, ...attachmentsToAdd]"
        :key="attachment.id"
        :description="formatFileSize(attachment.size)"
        icon="mdi:file-outline"
        @click="
          !editingAttachmentId && (isImage(attachment.fileName)
            ? viewAttachment(attachment)
            : downloadAttachment(attachment))
        "
      >
        <template #title>
          <div class="flex items-center gap-2 w-full">
            <input
              v-if="editingAttachmentId === attachment.id"
              ref="editInput"
              v-model="editingFileName"
              type="text"
              class="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              @click.stop
              @keyup.enter="saveRename(attachment)"
              @keyup.escape="cancelRename"
              @blur="saveRename(attachment)"
            />
            <span v-else class="flex-1">{{ attachment.fileName }}</span>

            <!-- Edit Button -->
            <UiButton
              v-if="!readOnly && editingAttachmentId !== attachment.id"
              variant="ghost"
              color="neutral"
              icon="mdi:pencil"
              size="sm"
              :tooltip="t('rename')"
              @click.stop="startRename(attachment)"
            />

            <!-- Save/Cancel Buttons (while editing) -->
            <template v-if="editingAttachmentId === attachment.id">
              <UiButton
                variant="ghost"
                color="neutral"
                icon="mdi:close"
                size="sm"
                :tooltip="t('cancel')"
                @click.stop="cancelRename"
              />
              <UiButton
                variant="ghost"
                color="primary"
                icon="mdi:check"
                size="sm"
                :tooltip="t('save')"
                @click.stop="saveRename(attachment)"
              />
            </template>
          </div>
        </template>
        <template #footer>
          <div class="flex gap-2">
            <!-- View/Preview Button (for images) -->
            <UiButton
              v-if="isImage(attachment.fileName)"
              variant="ghost"
              color="neutral"
              icon="mdi:eye-outline"
              size="sm"
              :tooltip="t('view')"
              @click.stop="viewAttachment(attachment)"
            />

            <!-- Download Button -->
            <UiButton
              variant="ghost"
              color="neutral"
              icon="mdi:download"
              size="sm"
              :tooltip="t('download')"
              @click.stop="downloadAttachment(attachment)"
            />

            <!-- Delete Button -->
            <UiButton
              v-if="!readOnly"
              variant="ghost"
              color="error"
              icon="mdi:trash-outline"
              size="sm"
              :tooltip="t('delete')"
              @click.stop="deleteAttachment(attachment.id)"
            />
          </div>
        </template>
      </UPageCard>
    </UPageGrid>

    <!-- No Attachments Message -->
    <div
      v-if="!attachments.length && !attachmentsToAdd.length && readOnly"
      class="text-center text-dimmed py-8"
    >
      {{ t("noAttachments") }}
    </div>

    <!-- Upload Button -->
    <div v-if="!readOnly" class="pt-4">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        @change="onFileChange"
      />
      <UiButton
        icon="mdi:plus"
        :label="t('addAttachment')"
        block
        color="primary"
        variant="outline"
        @click="fileInput?.click()"
      />
    </div>

    <!-- Preview Drawer -->
    <UiDrawer
      v-model:open="showPreview"
      direction="right"
      :overlay="false"
      :modal="false"
      :title="previewFile?.fileName || ''"
    >
      <template #content>
        <div class="p-4 h-full flex flex-col">
          <!-- Action Buttons -->
          <div class="flex gap-2 mb-4">
            <UiButton
              variant="ghost"
              color="neutral"
              icon="mdi:download"
              size="sm"
              :tooltip="t('download')"
              @click="previewFile && downloadAttachment(previewFile)"
            />
            <UiButton
              variant="ghost"
              color="neutral"
              icon="mdi:close"
              size="sm"
              :tooltip="t('close')"
              @click="showPreview = false"
            />
          </div>

          <!-- Image Preview -->
          <div class="flex-1 bg-muted/20 rounded flex items-center justify-center overflow-auto">
            <img
              v-if="previewDataUrl"
              :src="previewDataUrl"
              :alt="previewFile?.fileName"
              class="max-w-full max-h-full object-contain rounded"
            />
          </div>

          <!-- Footer Info -->
          <div class="flex justify-between items-center text-sm text-muted-foreground mt-4 pt-4 border-t">
            <span>{{ formatFileSize(previewFile?.size) }}</span>
            <span>{{ previewFile?.fileName }}</span>
          </div>
        </div>
      </template>
    </UiDrawer>
  </div>
</template>

<script setup lang="ts">
import { eq } from "drizzle-orm";
import { haexPasswordsBinaries } from "~/database/schemas";
import type { SelectHaexPasswordsItemBinaries } from "~/database/schemas";

interface AttachmentWithSize extends SelectHaexPasswordsItemBinaries {
  size?: number;
}

const props = defineProps<{
  itemId: string;
  readOnly?: boolean;
}>();

const attachments = defineModel<AttachmentWithSize[]>({ default: [] });
const attachmentsToAdd = defineModel<AttachmentWithSize[]>("attachmentsToAdd", {
  default: [],
});
const attachmentsToDelete = defineModel<SelectHaexPasswordsItemBinaries[]>(
  "attachmentsToDelete",
  { default: [] }
);

const { t } = useI18n();
const { orm } = storeToRefs(useHaexHubStore());
const { client } = useHaexHubStore();
const toast = useToast();

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const editInput = useTemplateRef<HTMLInputElement>("editInput");
const showPreview = ref(false);
const previewFile = ref<AttachmentWithSize | null>(null);
const previewDataUrl = ref<string | null>(null);
const editingAttachmentId = ref<string | null>(null);
const editingFileName = ref("");

// File size formatter
function formatFileSize(bytes?: number): string {
  if (!bytes) return t("unknown");

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Check if file is an image
function isImage(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
    ext || ""
  );
}

// Upload new attachment
async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);

  if (!files.length) return;

  try {
    for (const file of files) {
      // Read file as base64
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const binaryString = String.fromCharCode(...Array.from(uint8Array));
      const base64 = btoa(binaryString);

      // Calculate hash and add to database via helper
      const { addBinaryAsync } = await import("~/utils/cleanup");
      const hash = await addBinaryAsync(orm.value!, base64, uint8Array.length);

      // Add to attachments list
      attachmentsToAdd.value.push({
        id: crypto.randomUUID(),
        itemId: props.itemId,
        binaryHash: hash,
        fileName: file.name,
        size: file.size,
      });
    }

    toast.add({
      title: t("uploadSuccess"),
      color: "success",
    });
  } catch (error) {
    console.error("[Attachments] Upload error:", error);
    toast.add({
      title: t("uploadError"),
      color: "error",
    });
  }

  // Reset input
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

// Download attachment
async function downloadAttachment(attachment: AttachmentWithSize) {
  if (!orm.value) return;

  console.log("[Attachments] Download - attachment:", attachment);
  console.log("[Attachments] Download - binaryHash:", attachment.binaryHash);

  try {
    const result = await orm.value
      .select()
      .from(haexPasswordsBinaries)
      .where(eq(haexPasswordsBinaries.hash, attachment.binaryHash))
      .limit(1);

    console.log("[Attachments] Download - query result:", result);
    console.log("[Attachments] Download - result length:", result.length);
    console.log("[Attachments] Download - has data:", result[0]?.data ? "yes" : "no");

    if (!result.length || !result[0]?.data) {
      console.error("[Attachments] Download - Binary not found in database");
      toast.add({
        title: t("downloadError"),
        description: t("binaryNotFound"),
        color: "error",
      });
      return;
    }

    // Convert base64 to Uint8Array
    const base64 = result[0].data;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Use HaexHub Filesystem API to save file
    if (!client) {
      toast.add({
        title: t("downloadError"),
        description: "HaexHub client not available",
        color: "error",
      });
      return;
    }

    const saveResult = await client.filesystem.saveFileAsync(bytes, {
      defaultPath: attachment.fileName,
      title: t("saveFile"),
    });

    if (!saveResult) {
      // User cancelled
      return;
    }

    toast.add({
      title: t("downloadSuccess"),
      color: "success",
    });
  } catch (error) {
    console.error("[Attachments] Download error:", error);
    toast.add({
      title: t("downloadError"),
      color: "error",
    });
  }
}

// View attachment (for images)
async function viewAttachment(attachment: AttachmentWithSize) {
  if (!orm.value) return;

  console.log("[Attachments] View - attachment:", attachment);
  console.log("[Attachments] View - binaryHash:", attachment.binaryHash);

  try {
    const result = await orm.value
      .select()
      .from(haexPasswordsBinaries)
      .where(eq(haexPasswordsBinaries.hash, attachment.binaryHash))
      .limit(1);

    console.log("[Attachments] View - query result:", result);
    console.log("[Attachments] View - result length:", result.length);
    console.log("[Attachments] View - has data:", result[0]?.data ? "yes" : "no");

    if (!result.length || !result[0]?.data) {
      console.error("[Attachments] View - Binary not found in database");
      toast.add({
        title: t("viewError"),
        description: t("binaryNotFound"),
        color: "error",
      });
      return;
    }

    previewFile.value = attachment;
    previewDataUrl.value = `data:image/png;base64,${result[0].data}`;
    showPreview.value = true;
  } catch (error) {
    console.error("[Attachments] View error:", error);
    toast.add({
      title: t("viewError"),
      color: "error",
    });
  }
}

// Delete attachment
function deleteAttachment(id: string) {
  const attachment = attachments.value.find((a) => a.id === id);
  if (attachment) {
    attachmentsToDelete.value.push(attachment);
    attachments.value = attachments.value.filter((a) => a.id !== id);
  }

  attachmentsToAdd.value = attachmentsToAdd.value.filter((a) => a.id !== id);
}

// Rename attachment
function startRename(attachment: AttachmentWithSize) {
  editingAttachmentId.value = attachment.id;
  editingFileName.value = attachment.fileName;

  // Focus input after render
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
}

function cancelRename() {
  editingAttachmentId.value = null;
  editingFileName.value = "";
}

function saveRename(attachment: AttachmentWithSize) {
  if (!editingFileName.value.trim()) {
    cancelRename();
    return;
  }

  // Update in attachments array
  const index = attachments.value.findIndex((a) => a.id === attachment.id);
  if (index !== -1 && attachments.value[index]) {
    attachments.value[index].fileName = editingFileName.value.trim();
  }

  // Update in attachmentsToAdd array
  const indexToAdd = attachmentsToAdd.value.findIndex((a) => a.id === attachment.id);
  if (indexToAdd !== -1 && attachmentsToAdd.value[indexToAdd]) {
    attachmentsToAdd.value[indexToAdd].fileName = editingFileName.value.trim();
  }

  cancelRename();
}
</script>

<i18n lang="yaml">
de:
  noAttachments: Keine Anhänge vorhanden
  addAttachment: Anhang hinzufügen
  view: Anzeigen
  download: Herunterladen
  delete: Löschen
  rename: Umbenennen
  cancel: Abbrechen
  save: Speichern
  close: Schließen
  saveFile: Datei speichern
  unknown: Unbekannt
  uploadSuccess: Anhänge erfolgreich hinzugefügt
  uploadError: Fehler beim Hochladen der Anhänge
  downloadSuccess: Anhang erfolgreich heruntergeladen
  downloadError: Fehler beim Herunterladen des Anhangs
  viewError: Fehler beim Anzeigen des Anhangs
  binaryNotFound: Binärdaten nicht gefunden

en:
  noAttachments: No attachments
  addAttachment: Add attachment
  view: View
  download: Download
  delete: Delete
  rename: Rename
  cancel: Cancel
  save: Save
  close: Close
  saveFile: Save File
  unknown: Unknown
  uploadSuccess: Attachments successfully added
  uploadError: Error uploading attachments
  downloadSuccess: Attachment successfully downloaded
  downloadError: Error downloading attachment
  viewError: Error viewing attachment
  binaryNotFound: Binary data not found
</i18n>
