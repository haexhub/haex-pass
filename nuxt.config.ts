// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@haexhub/sdk/nuxt", // HaexHub SDK with automatic polyfill injection
  ],
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

  i18n: {
    strategy: "prefix_and_default",
    defaultLocale: "de",

    locales: [
      { code: "de", language: "de-DE", isCatchallLocale: true },
      { code: "en", language: "en-EN" },
    ],

    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root", // recommended
    },
    types: "composition",
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
