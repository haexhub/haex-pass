import { useDebounceFn } from '@vueuse/core'

export const useSearchStore = defineStore('searchStore', () => {
  const searchInput = ref<string>('')
  const search = ref<string>('')

  // Debounce the search to avoid blocking the UI
  const updateSearch = useDebounceFn((value: string) => {
    search.value = value
  }, 300)

  // Watch searchInput and update search with debounce
  watch(searchInput, (newValue) => {
    updateSearch(newValue)
  })

  return {
    search,
    searchInput,
  }
})
