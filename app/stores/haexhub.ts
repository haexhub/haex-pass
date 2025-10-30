// stores/haexhub.ts
import { defineStore, storeToRefs } from 'pinia'
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import * as schema from '~/database/schemas'
import { createTablesAsync } from '~/database/createTables'

export const useHaexHubStore = defineStore('haexhub', () => {
  const nuxtApp = useNuxtApp()
  const haexhub = nuxtApp.$haexhub

  const isSetupComplete = ref(false)
  const isInitialized = ref(false)

  let db: SqliteRemoteDatabase<typeof schema> | null = null

  // Initialize database and setup hook (runs once)
  const initializeAsync = async () => {
    if (isInitialized.value) return

    console.log('[haex-pass] Initializing HaexHub SDK')

    // Initialize database schema
    db = haexhub.client.initializeDatabase(schema)
    console.log('[haex-pass] Database initialized:', !!db, 'client.db:', !!haexhub.client.db)

    // Register setup hook for table creation
    haexhub.client.onSetup(async () => {
      await createTablesAsync(haexhub.client)
    })

    // Setup context watcher
    const { currentThemeName, context } = storeToRefs(useUiStore())
    const { defaultLocale, locales, setLocale } = useI18n()

    watch(
      () => haexhub.state.value.context,
      (newContext) => {
        console.log('[haex-pass] Context changed:', newContext)
        if (!newContext) return

        context.value = newContext
        currentThemeName.value = newContext.theme || 'dark'

        const locale =
          locales.value.find((l) => l.code == newContext.locale)?.code ||
          defaultLocale

        setLocale(locale)
      },
      { immediate: true }
    )

    isInitialized.value = true
  }

  // Wait for setup to complete
  const waitForSetupAsync = async () => {
    if (isSetupComplete.value) return

    console.log('[haex-pass] Waiting for setup completion...')
    await haexhub.client.setupComplete()
    console.log('[haex-pass] Setup complete')

    isSetupComplete.value = true
  }

  return {
    client: haexhub.client,
    state: haexhub.state,
    get db() {
      return db
    },
    getTableName: (tableName: string) => haexhub.client.getTableName(tableName),
    isSetupComplete: readonly(isSetupComplete),
    initializeAsync,
    waitForSetupAsync,
  }
})
