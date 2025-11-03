<template>
  <UiDialogConfirm
    v-model:open="isOpen"
    :title="t('title')"
    :confirm-label="t('use')"
    :abort-label="t('cancel')"
    confirm-icon="i-lucide-check"
    abort-icon="i-lucide-x"
    @confirm="usePasswordAsync"
  >
    <template #body>
      <div class="space-y-4 w-full">
        <!-- Generated Password Display -->
        <UiInput
          v-model="generatedPassword"
          :label="t('generatedPassword')"
          :read-only="true"
          class="font-mono w-full"
        >
          <template #trailing>
            <UiButton
              icon="i-lucide-refresh-cw"
              size="sm"
              variant="link"
              color="neutral"
              :tooltip="t('regenerate')"
              @click="generatePasswordAsync"
            />
            <UiButton
              icon="i-lucide-copy"
              size="sm"
              variant="link"
              color="neutral"
              :tooltip="t('copy')"
              @click="copyPasswordAsync"
            />
          </template>
        </UiInput>

        <!-- Password Length -->
        <div class="w-full">
          <label class="block text-sm font-medium mb-2">
            {{ t("length") }}: {{ options.length }}
          </label>
          <USlider
            v-model="options.length"
            :min="4"
            :max="128"
            @update:model-value="generatePasswordAsync"
          />
        </div>

        <!-- Character Types -->
        <div class="space-y-2">
          <label class="block text-sm font-medium mb-2">{{
            t("characterTypes")
          }}</label>

          <div class="flex gap-2 flex-wrap">
            <UiButton
              :color="options.uppercase ? 'primary' : 'neutral'"
              :variant="options.uppercase ? 'solid' : 'outline'"
              size="sm"
              :tooltip="t('uppercase')"
              @click="toggleOption('uppercase')"
            >
              A-Z
            </UiButton>

            <UiButton
              :color="options.lowercase ? 'primary' : 'neutral'"
              :variant="options.lowercase ? 'solid' : 'outline'"
              size="sm"
              :tooltip="t('lowercase')"
              @click="toggleOption('lowercase')"
            >
              a-z
            </UiButton>

            <UiButton
              :color="options.numbers ? 'primary' : 'neutral'"
              :variant="options.numbers ? 'solid' : 'outline'"
              size="sm"
              :tooltip="t('numbers')"
              @click="toggleOption('numbers')"
            >
              0-9
            </UiButton>

            <UiButton
              :color="options.symbols ? 'primary' : 'neutral'"
              :variant="options.symbols ? 'solid' : 'outline'"
              size="sm"
              :tooltip="t('symbols')"
              @click="toggleOption('symbols')"
            >
              !@#
            </UiButton>
          </div>
        </div>

        <!-- Exclude Characters -->
        <UiInput
          v-model="options.excludeChars"
          :label="t('excludeChars')"
          :placeholder="t('excludeCharsPlaceholder')"
          class="w-full"
          @change="generatePasswordAsync"
        />

        <!-- Pattern Mode -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <UCheckbox
              v-model="usePattern"
              :label="t('usePattern')"
            />
            <UPopover mode="hover" :popper="{ placement: 'right' }">
              <UiButton
                icon="i-lucide-info"
                size="sm"
                variant="ghost"
                color="neutral"
              />
              <template #content>
                <div class="p-4 w-fit">
                  <h4 class="font-semibold mb-2">{{ t('patternHelpTitle') }}</h4>
                  <ul class="text-sm space-y-1">
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">c</code> = {{ t('patternHelp.c') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">C</code> = {{ t('patternHelp.C') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">v</code> = {{ t('patternHelp.v') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">V</code> = {{ t('patternHelp.V') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">d</code> = {{ t('patternHelp.d') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">a</code> = {{ t('patternHelp.a') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">A</code> = {{ t('patternHelp.A') }}</li>
                    <li><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">s</code> = {{ t('patternHelp.s') }}</li>
                    <li>{{ t('patternHelp.other') }}</li>
                  </ul>
                </div>
              </template>
            </UPopover>
          </div>
        </div>

        <!-- Pattern Input -->
        <UiInput
          v-if="usePattern"
          v-model="pattern"
          :label="t('pattern')"
          :placeholder="t('patternPlaceholder')"
          class="w-full"
        />
      </div>
    </template>
  </UiDialogConfirm>
</template>

<script setup lang="ts">
import type { AcceptableValue } from "@nuxt/ui/runtime/types/utils.js";
import { useClipboard } from "@vueuse/core";

const value = defineModel<AcceptableValue | undefined>();

const isOpen = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
const { copy } = useClipboard();
const toast = useToast();

const options = reactive({
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeChars: "" as string,
});

const usePattern = ref(false);
const pattern = ref<string>("cccc-cccc-cccc");

const generatedPassword = ref<string>("");

// Toggle option and regenerate password
const toggleOption = (option: "uppercase" | "lowercase" | "numbers" | "symbols") => {
  options[option] = !options[option];
  generatePasswordAsync();
};

// Helper function to get a random character from a string
const getRandomChar = (charset: string): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomValue = array[0] ?? 0;
  const index = randomValue % charset.length;
  return charset.charAt(index);
};

const generatePasswordAsync = async () => {
  // Pattern-based generation
  if (usePattern.value && pattern.value) {
    const result: string[] = [];
    const patternChars = pattern.value.split("");

    for (const char of patternChars) {
      if (char === "c") {
        // consonant
        result.push(getRandomChar("bcdfghjklmnpqrstvwxyz"));
      } else if (char === "C") {
        // uppercase consonant
        result.push(getRandomChar("BCDFGHJKLMNPQRSTVWXYZ"));
      } else if (char === "v") {
        // vowel
        result.push(getRandomChar("aeiou"));
      } else if (char === "V") {
        // uppercase vowel
        result.push(getRandomChar("AEIOU"));
      } else if (char === "d") {
        // digit
        result.push(getRandomChar("0123456789"));
      } else if (char === "a") {
        // any lowercase letter
        result.push(getRandomChar("abcdefghijklmnopqrstuvwxyz"));
      } else if (char === "A") {
        // any uppercase letter
        result.push(getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
      } else if (char === "s") {
        // special character / symbol
        result.push(getRandomChar("!@#$%^&*()_+-=[]{}|;:,.<>?"));
      } else {
        // literal character
        result.push(char);
      }
    }

    generatedPassword.value = result.join("");
    return;
  }

  // Standard character-based generation
  const charset = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };

  let chars = "";
  if (options.uppercase) chars += charset.uppercase;
  if (options.lowercase) chars += charset.lowercase;
  if (options.numbers) chars += charset.numbers;
  if (options.symbols) chars += charset.symbols;

  // Remove excluded characters
  if (options.excludeChars) {
    const excludeSet = new Set(options.excludeChars.split(""));
    chars = chars
      .split("")
      .filter((c) => !excludeSet.has(c))
      .join("");
  }

  if (!chars) {
    generatedPassword.value = "";
    return;
  }

  // Generate password using crypto.getRandomValues for better randomness
  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  generatedPassword.value = Array.from(array)
    .map((x) => chars[x % chars.length])
    .join("");
};

const copyPasswordAsync = async () => {
  await copy(generatedPassword.value);
  toast.add({
    title: t("copied"),
    color: "success",
  });
};

const usePasswordAsync = async () => {
  value.value = generatedPassword.value;
  isOpen.value = false;
  toast.add({
    title: t("passwordSet"),
    color: "success",
  });
};

// Generate initial password when dialog opens
watch(isOpen, (newValue) => {
  if (newValue) {
    generatePasswordAsync();
  }
});

// Regenerate password when pattern changes
watch(pattern, () => {
  if (usePattern.value && pattern.value) {
    generatePasswordAsync();
  }
});
</script>

<i18n lang="yaml">
de:
  title: Passwort generieren
  generatedPassword: Generiertes Passwort
  copy: Kopieren
  regenerate: Neu generieren
  length: Länge
  characterTypes: Zeichentypen
  uppercase: Großbuchstaben (A-Z)
  lowercase: Kleinbuchstaben (a-z)
  numbers: Zahlen (0-9)
  symbols: Sonderzeichen
  excludeChars: Zeichen ausschließen
  excludeCharsPlaceholder: z.B. äöü
  usePattern: Pattern-Modus verwenden
  pattern: Pattern
  patternPlaceholder: z.B. ccvc-ccvc-ccvc
  patternHelpTitle: Pattern-Zeichen
  patternHelp:
    c: Kleinbuchstaben-Konsonant (b, d, f, g...)
    C: Großbuchstaben-Konsonant (B, D, F, G...)
    v: Kleinbuchstaben-Vokal (a, e, i, o, u)
    V: Großbuchstaben-Vokal (A, E, I, O, U)
    d: Ziffer (0-9)
    a: beliebiger Kleinbuchstabe
    A: beliebiger Großbuchstabe
    s: "Sonderzeichen (!{'@'}#$%^&*...)"
    other: Andere Zeichen = Trennzeichen (-, _, ., etc.)
  cancel: Abbrechen
  use: Verwenden
  copied: Passwort kopiert
  passwordSet: Passwort übernommen

en:
  title: Generate Password
  generatedPassword: Generated Password
  copy: Copy
  regenerate: Regenerate
  length: Length
  characterTypes: Character Types
  uppercase: Uppercase (A-Z)
  lowercase: Lowercase (a-z)
  numbers: Numbers (0-9)
  symbols: Special Characters
  excludeChars: Exclude Characters
  excludeCharsPlaceholder: e.g. äöü
  usePattern: Use pattern mode
  pattern: Pattern
  patternPlaceholder: e.g. ccvc-ccvc-ccvc
  patternHelpTitle: Pattern characters
  patternHelp:
    c: lowercase consonant (b, d, f, g...)
    C: uppercase consonant (B, D, F, G...)
    v: lowercase vowel (a, e, i, o, u)
    V: uppercase vowel (A, E, I, O, U)
    d: digit (0-9)
    a: any lowercase letter
    A: any uppercase letter
    s: "special character (!{'@'}#$%^&*...)"
    other: Other characters = separators (-, _, ., etc.)
  cancel: Cancel
  use: Use
  copied: Password copied
  passwordSet: Password applied
</i18n>
