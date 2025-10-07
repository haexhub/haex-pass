export default defineNuxtPlugin(async () => {
  const haexHub = useHaexHub();

  // Override localStorage with HaexHub storage API
  const storage = {
    async getItem(key: string) {
      return await haexHub.storage.getItem(key);
    },
    async setItem(key: string, value: string) {
      await haexHub.storage.setItem(key, value);
    },
    async removeItem(key: string) {
      await haexHub.storage.removeItem(key);
    },
    async clear() {
      await haexHub.storage.clear();
    },
  };

  // For synchronous access, use a cache
  const cache = new Map<string, string>();

  // Load all keys into cache on init
  const keys = await haexHub.storage.keys();
  await Promise.all(
    keys.map(async (key) => {
      const value = await storage.getItem(key);
      if (value !== null) cache.set(key, value);
    })
  );

  // Provide sync-like API
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => {
        cache.set(key, value);
        storage.setItem(key, value); // async in background
      },
      removeItem: (key: string) => {
        cache.delete(key);
        storage.removeItem(key); // async in background
      },
      clear: () => {
        cache.clear();
        storage.clear(); // async in background
      },
      get length() {
        return cache.size;
      },
      key: (index: number) => {
        return Array.from(cache.keys())[index] ?? null;
      },
    },
  });
});
