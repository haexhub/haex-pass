// composables/useHaexHub.ts
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import * as schema from '~/database/schemas'

export const useHaexHub = () => {
  const { currentThemeName, context } = storeToRefs(useUiStore())
  // Get SDK instance from Nuxt plugin
  const nuxtApp = useNuxtApp()
  const haexhub = nuxtApp.$haexhub

  const { defaultLocale, locales, setLocale } = useI18n()

  // Initialize database with schema if not already initialized
  if (!haexhub.client.db) {
    console.log('[haex-pass] Initializing database with schema')
    haexhub.client.initializeDatabase(schema)
  }

  // Watch for context changes and update theme
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

  return {
    client: haexhub.client,
    state: haexhub.state,
    db: haexhub.client.db,
    getTableName: haexhub.client.getTableName.bind(haexhub.client),
  }
}
