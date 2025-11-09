<template>
  <div class="">
    <!-- Attachment Grid -->
    <UPageGrid v-if="attachments.length || attachmentsToAdd.length">
      <UCard
        v-for="attachment in [...attachments, ...attachmentsToAdd]"
        :key="attachment.id"
        :ui="{ body: 'p-0 sm:p-0' }"
        class="group cursor-pointer overflow-hidden"
        @click="
          !editingAttachmentId &&
            (isImage(attachment.fileName)
              ? openImageAsync(attachment)
              : downloadAttachment(attachment))
        "
      >
        <!-- Image attachments with overlay -->
        <div
          v-if="isImage(attachment.fileName)"
          class="relative w-full aspect-video overflow-hidden"
        >
          <img
            v-if="imageDataUrls.get(attachment.id)"
            :src="imageDataUrls.get(attachment.id)"
            :alt="attachment.fileName"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-muted/20"
          >
            <Icon
              name="mdi:image-outline"
              size="32"
              class="text-muted-foreground"
            />
          </div>

          <!-- Info Overlay at Bottom -->
          <div
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <input
                  v-if="editingAttachmentId === attachment.id"
                  ref="editInput"
                  v-model="editingFileName"
                  type="text"
                  class="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white/90"
                  @click.stop
                  @keyup.enter="saveRename(attachment)"
                  @keyup.escape="cancelRename"
                  @blur="saveRename(attachment)"
                />
                <div v-else class="text-white font-medium text-sm truncate">
                  {{ attachment.fileName }}
                </div>
                <div class="text-white/70 text-xs mt-0.5">
                  {{ formatFileSize(attachment.size) }}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-1 shrink-0">
                <UiButton
                  variant="ghost"
                  color="neutral"
                  icon="mdi:download"
                  size="sm"
                  class="bg-white/10 hover:bg-white/20 text-white"
                  :tooltip="t('download')"
                  @click.stop="downloadAttachment(attachment)"
                />
                <UiButton
                  v-if="!readOnly && editingAttachmentId !== attachment.id"
                  variant="ghost"
                  color="neutral"
                  icon="mdi:pencil"
                  size="sm"
                  class="bg-white/10 hover:bg-white/20 text-white"
                  :tooltip="t('rename')"
                  @click.stop="startRename(attachment)"
                />
                <template v-if="editingAttachmentId === attachment.id">
                  <UiButton
                    variant="ghost"
                    color="neutral"
                    icon="mdi:close"
                    size="sm"
                    class="bg-white/10 hover:bg-white/20 text-white"
                    :tooltip="t('cancel')"
                    @click.stop="cancelRename"
                  />
                  <UiButton
                    variant="ghost"
                    color="primary"
                    icon="mdi:check"
                    size="sm"
                    class="bg-white/10 hover:bg-white/20 text-white"
                    :tooltip="t('save')"
                    @click.stop="saveRename(attachment)"
                  />
                </template>
                <UiButton
                  v-if="!readOnly"
                  variant="ghost"
                  color="error"
                  icon="mdi:trash-outline"
                  size="sm"
                  class="bg-white/10 hover:bg-white/20 text-white"
                  :tooltip="t('delete')"
                  @click.stop="deleteAttachment(attachment.id)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Non-image files: compact card layout -->
        <div v-if="!isImage(attachment.fileName)" class="p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <input
                v-if="editingAttachmentId === attachment.id"
                ref="editInput"
                v-model="editingFileName"
                type="text"
                class="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                @click.stop
                @keyup.enter="saveRename(attachment)"
                @keyup.escape="cancelRename"
                @blur="saveRename(attachment)"
              />
              <div v-else class="font-medium text-sm truncate">
                {{ attachment.fileName }}
              </div>
              <div class="text-muted-foreground text-xs mt-0.5">
                {{ formatFileSize(attachment.size) }}
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-1 shrink-0">
              <UiButton
                variant="ghost"
                color="neutral"
                icon="mdi:download"
                size="sm"
                :tooltip="t('download')"
                @click.stop="downloadAttachment(attachment)"
              />
              <UiButton
                v-if="!readOnly && editingAttachmentId !== attachment.id"
                variant="ghost"
                color="neutral"
                icon="mdi:pencil"
                size="sm"
                :tooltip="t('rename')"
                @click.stop="startRename(attachment)"
              />
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
          </div>
        </div>
      </UCard>
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
      :title="previewFile?.fileName || ''"
      :description="previewFile?.fileName"
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
          <div
            class="flex-1 bg-muted/20 rounded flex items-center justify-center overflow-auto"
          >
            <img
              v-if="previewDataUrl"
              :src="previewDataUrl"
              :alt="previewFile?.fileName"
              class="max-w-full max-h-full object-contain rounded"
            />
          </div>

          <!-- Footer Info -->
          <div
            class="flex justify-between items-center text-sm text-muted-foreground mt-4 pt-4 border-t"
          >
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
const imageDataUrls = reactive(new Map<string, string>());

// WORKAROUND: Trigger tabs rerender when drawer closes
const { triggerTabsRerender } = useUiStore();

watch(showPreview, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    triggerTabsRerender();
  }
});

// Load all images when attachments change
async function loadAllImagesAsync() {
  if (!orm.value) return;

  const allAttachments = [...attachments.value, ...attachmentsToAdd.value];

  for (const attachment of allAttachments) {
    if (isImage(attachment.fileName) && !imageDataUrls.has(attachment.id)) {
      try {
        const result = await orm.value
          .select()
          .from(haexPasswordsBinaries)
          .where(eq(haexPasswordsBinaries.hash, attachment.binaryHash))
          .limit(1);

        if (result.length && result[0]?.data) {
          const dataUrl = `data:image/png;base64,${result[0].data}`;
          imageDataUrls.set(attachment.id, dataUrl);
          console.log("[Attachments] Loaded image for:", attachment.fileName);
        } else {
          console.log("[Attachments] No data found for:", attachment.fileName);
        }
      } catch (error) {
        console.error("[Attachments] Error loading image:", error);
      }
    }
  }
}

// Watch for changes in attachments and load images
watch(
  () => [...attachments.value, ...attachmentsToAdd.value],
  () => {
    loadAllImagesAsync();
  },
  { immediate: true, deep: true }
);

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

// Open image with system viewer
async function openImageAsync(attachment: AttachmentWithSize) {
  if (!client) {
    toast.add({
      title: t("viewError"),
      description: "HaexHub client not available",
      color: "error",
    });
    return;
  }

  try {
    // Get the already loaded image data URL
    const dataUrl = imageDataUrls.get(attachment.id);
    if (!dataUrl) {
      toast.add({
        title: t("viewError"),
        description: t("binaryNotFound"),
        color: "error",
      });
      return;
    }

    // Convert base64 data URL to Uint8Array
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      toast.add({
        title: t("viewError"),
        color: "error",
      });
      return;
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine MIME type from file extension
    const ext = attachment.fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
    };
    const mimeType = mimeTypes[ext || ""] || "image/png";

    // Open file with system viewer
    const openResult = await client.filesystem.openFileAsync(bytes, {
      fileName: attachment.fileName,
      mimeType,
    });

    if (!openResult.success) {
      toast.add({
        title: t("viewError"),
        color: "error",
      });
    }
  } catch (error) {
    console.error("[Attachments] Open error:", error);
    toast.add({
      title: t("viewError"),
      color: "error",
    });
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
    console.log(
      "[Attachments] Download - has data:",
      result[0]?.data ? "yes" : "no"
    );

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
    console.log(
      "[Attachments] View - has data:",
      result[0]?.data ? "yes" : "no"
    );

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
  const indexToAdd = attachmentsToAdd.value.findIndex(
    (a) => a.id === attachment.id
  );
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
