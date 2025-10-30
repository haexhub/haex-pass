import {
  breakpointsTailwind,
  useBreakpoints,
  watchImmediate,
} from "@vueuse/core";
import de from "./de.json";
import en from "./en.json";

export const useUiStore = defineStore("uiStore", () => {
  const breakpoints = useBreakpoints(breakpointsTailwind);

  // "smAndDown" gilt für sm, xs usw.
  const isSmallScreen = breakpoints.smaller("sm");

  const { $i18n } = useNuxtApp();

  $i18n.setLocaleMessage("de", {
    ui: de,
  });
  $i18n.setLocaleMessage("en", { ui: en });

  const availableThemes = ref([
    {
      value: "dark",
      label: $i18n.t("ui.dark"),
      icon: "line-md:moon-rising-alt-loop",
    },
    {
      value: "light",
      label: $i18n.t("ui.light"),
      icon: "line-md:moon-to-sunny-outline-loop-transition",
    },
  ]);

  const defaultTheme = ref("dark");

  const currentThemeName = ref(defaultTheme.value);

  const currentTheme = computed(
    () =>
      availableThemes.value.find(
        (theme) => theme.value === currentThemeName.value
      ) ?? availableThemes.value.at(0)
  );

  const colorMode = useColorMode();

  watchImmediate(currentThemeName, () => {
    colorMode.preference = currentThemeName.value;
  });

  const context = ref();

  const currentLocale = ref();

  return {
    availableThemes,
    context,
    currentLocale,
    currentTheme,
    currentThemeName,
    defaultTheme,
    isSmallScreen,
  };
});
