// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxtjs/i18n", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  ssr: false,
  app: {
    baseURL: "./", // Relative paths
  },

  imports: {
    dirs: [
      "composables/**",
      "stores/**",
      "components/**",
      "pages/**",
      "types/**",
    ],
  },
  // Use static generation
  /* nitro: {
    preset: "static",
  }, */

  // Important: Disable payload extraction
  /* experimental: {
    payloadExtraction: false,
  }, */

  // Disable auto-imports of server composables
  /* imports: {
    autoImport: false, // or be selective
  }, */
  router: {
    options: {
      hashMode: true, // History mode, aber mit SPA fallback
    },
  },
});
