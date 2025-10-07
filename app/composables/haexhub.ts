// composables/useHaexHub.ts
import { createHaexHubClient } from "@haexhub/sdk";
import type {
  ApplicationContext,
  ExtensionInfo,
  HaexHubClient,
  HaexHubEvent,
} from "@haexhub/sdk";

interface ExtensionInfoLoadedEvent extends HaexHubEvent {
  type: "extension.info.loaded";
  data: {
    info: ExtensionInfo;
  };
}

interface ContextLoadedEvent extends HaexHubEvent {
  type: "context.loaded";
  data: {
    context: ApplicationContext;
  };
}

interface ContextChangedEvent extends HaexHubEvent {
  type: "context.changed";
  data: {
    context: ApplicationContext;
  };
}

let clientInstance: HaexHubClient | null = null;
const extensionInfoRef = ref<ExtensionInfo | null>(null);
const contextRef = ref<ApplicationContext | null>(null);

export const useHaexHub = () => {
  const { currentThemeName } = storeToRefs(useUiStore());

  if (!clientInstance) {
    clientInstance = createHaexHubClient({ debug: true });

    // ✅ Auf Events lauschen und Refs updaten
    clientInstance.on("extension.info.loaded", (event: HaexHubEvent) => {
      extensionInfoRef.value = (event as ExtensionInfoLoadedEvent).data.info;
    });

    clientInstance.on("context.loaded", (event: HaexHubEvent) => {
      contextRef.value = (event as ContextLoadedEvent).data.context;
    });

    clientInstance.on("context.changed", (event: HaexHubEvent) => {
      contextRef.value = (event as ContextChangedEvent).data.context;
    });
  }

  watch(contextRef, () => {
    currentThemeName.value = contextRef.value?.theme || "dark";
  });

  const getTableName = (tableName: string) => {
    if (!clientInstance) throw new Error("Client not initialized");
    return clientInstance.getTableName(tableName);
  };

  return {
    client: clientInstance,
    extensionInfo: readonly(extensionInfoRef),
    context: readonly(contextRef),
    db: clientInstance.db,
    storage: clientInstance.storage,
    getTableName,
  };
};
