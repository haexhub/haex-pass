// stores/haexhub.ts
import { defineStore, storeToRefs } from "pinia";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "~/database/schemas";
import manifest from "../../haextension/manifest.json";

// Import all migration SQL files
const migrationFiles = import.meta.glob("../database/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const useHaexHubStore = defineStore("haexhub", () => {
  const nuxtApp = useNuxtApp();
  const haexhub = nuxtApp.$haexhub;

  const isInitialized = ref(false);
  const orm = shallowRef<SqliteRemoteDatabase<typeof schema> | null>(null);

  // Get composables at the top of the store setup
  const { currentThemeName, context } = storeToRefs(useUiStore());
  const { defaultLocale, locales, setLocale } = useI18n();

  // Register setup hook for database migrations
  // IMPORTANT: This must be done at store initialization time, BEFORE any component
  // tries to use the database. The hook will be executed when setupComplete() is called.
  haexhub.client.onSetup(async () => {
    // Convert migration files to the format expected by the SDK
    const migrations = Object.entries(migrationFiles).map(
      ([path, content]) => {
        const fileName = path.split("/").pop()?.replace(".sql", "") || "";
        return {
          name: fileName,
          sql: content as string,
        };
      }
    );

    console.log(
      `[haex-pass] Running ${migrations.length} migration(s) in setup hook`
    );

    // Run migrations - this will create tables on first install
    // and apply schema updates on subsequent runs
    await haexhub.client.runMigrationsAsync(
      manifest.public_key,
      manifest.name,
      migrations
    );
  });

  // Initialize database and setup hook (runs once)
  const initializeAsync = async () => {
    if (isInitialized.value) return;

    console.log("[haex-pass] Initializing HaexHub SDK");

    // Initialize database schema
    orm.value = haexhub.client.initializeDatabase(schema);
    console.log("[haex-pass] Database initialized:", !!orm.value);

    // Trigger setup to run the registered hook (migrations)
    // This will execute the hook we registered above
    await haexhub.client.setupComplete();
    console.log("[haex-pass] Setup complete");

    // Setup context watcher
    watch(
      () => haexhub.state.value.context,
      (newContext) => {
        console.log("[haex-pass] Context changed:", newContext);
        if (!newContext) return;

        context.value = newContext;
        currentThemeName.value = newContext.theme || "dark";

        const locale =
          locales.value.find((l) => l.code === newContext.locale)?.code ||
          defaultLocale;

        setLocale(locale);
      },
      { immediate: true }
    );

    isInitialized.value = true;
  };

  // Wait for setup to complete
  const waitForSetupAsync = async () => {
    if (haexhub.state.value.isSetupComplete) return;

    console.log("[haex-pass] Waiting for setup completion...");
    await haexhub.client.setupComplete();
    console.log("[haex-pass] Setup complete");
  };

  return {
    client: haexhub.client,
    state: haexhub.state,
    orm,
    getTableName: (tableName: string) => haexhub.client.getTableName(tableName),
    initializeAsync,
    waitForSetupAsync,
  };
});
