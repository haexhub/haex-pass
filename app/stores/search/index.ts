export const useSearchStore = defineStore('searchStore', () => {
  const search = ref<string>('')

  return {
    search,
  }
})
