import type { RouteLocationRawI18n } from "vue-router";

/* export const bytesToBase64DataUrlAsync = async (
  bytes: Uint8Array,
  type = 'application/octet-stream',
) => {
  return await new Promise((resolve, reject) => {
    const reader = Object.assign(new FileReader(), {
      onload: () => resolve(reader.result),
      onerror: () => reject(reader.error),
    })
    reader.readAsDataURL(new File([new Blob([bytes])], '', { type }))
  })
} */

export const blobToImageAsync = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    console.log("transform blob", blob);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.src = url;
  });
};

export const readableFileSize = (sizeInByte: number | string = 0) => {
  if (!sizeInByte) {
    return "0 KB";
  }
  const size =
    typeof sizeInByte === "string" ? parseInt(sizeInByte) : sizeInByte;
  const sizeInKb = size / 1024;
  const sizeInMb = sizeInKb / 1024;
  const sizeInGb = sizeInMb / 1024;
  const sizeInTb = sizeInGb / 1024;

  if (sizeInTb > 1) return `${sizeInTb.toFixed(2)} TB`;
  if (sizeInGb > 1) return `${sizeInGb.toFixed(2)} GB`;
  if (sizeInMb > 1) return `${sizeInMb.toFixed(2)} MB`;

  return `${sizeInKb.toFixed(2)} KB`;
};

export const getSingleRouteParam = (
  param: string | string[] | undefined
): string => {
  const _param = Array.isArray(param) ? param.at(0) ?? "" : param ?? "";
  console.log('getSingleRouteParam found:', _param, param)
  return decodeURIComponent(_param);
};

export const isRouteActive = (
  to: RouteLocationRawI18n,
  exact: boolean = false
) =>
  computed(() => {
    const found = useRouter()
      .getRoutes()
      .find((route) => route.name === useLocaleRoute()(to)?.name);
    //console.log('found route', found, useRouter().currentRoute.value, to);
    return exact
      ? found?.name === useRouter().currentRoute.value.name
      : found?.name === useRouter().currentRoute.value.name ||
          found?.children.some(
            (child) => child.name === useRouter().currentRoute.value.name
          );
  });

export const isKey = <T extends object>(x: T, k: PropertyKey): k is keyof T => {
  return k in x;
};

export const filterAsync = async <T>(
  arr: T[],
  predicate: (value: T, index: number, array: T[]) => Promise<boolean>
) => {
  // 1. Mappe jedes Element auf ein Promise, das zu true/false auflöst
  const results = await Promise.all(arr.map(predicate));

  // 2. Filtere das ursprüngliche Array basierend auf den Ergebnissen
  return arr.filter((_value, index) => results[index]);
};

export const stringToHex = (str: string) =>
  str
    .split("")
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join(""); // Join array into a single string

export const hexToString = (hex: string) => {
  if (!hex) return "";
  const parsedValue = hex
    .match(/.{1,2}/g) // Split hex into pairs
    ?.map((byte) => String.fromCharCode(parseInt(byte, 16))) // Convert hex to char
    .join(""); // Join array into a single string

  return parsedValue ? parsedValue : "";
};

export const getContrastingTextColor = (
  hexColor?: string | null
): "black" | "white" => {
  if (!hexColor) {
    return "black"; // Fallback
  }

  // Entferne das '#' vom Anfang
  let color = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;

  // Handle Kurzform-Hex-Werte (z.B. "F0C" -> "FF00CC")
  if (color.length === 3) {
    color = color
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (color.length !== 6) {
    return "black"; // Fallback für ungültige Farben
  }

  // Konvertiere Hex zu RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Berechne die wahrgenommene Luminanz nach der WCAG-Formel.
  // Werte von 0 (schwarz) bis 255 (weiß).
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Wähle die Textfarbe basierend auf einem Schwellenwert.
  // Ein Wert > 186 wird oft als "hell" genug für schwarzen Text angesehen.
  return luminance > 186 ? "black" : "white";
};

/**
 * Eine "Type Guard"-Funktion, die prüft, ob ein Wert ein Objekt (aber nicht null) ist.
 * Wenn sie `true` zurückgibt, weiß TypeScript, dass der Wert sicher als Objekt behandelt werden kann.
 * @param value Der zu prüfende Wert vom Typ `unknown`.
 * @returns {boolean} `true`, wenn der Wert ein Objekt ist.
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Führt einen typsicheren, tiefen Vergleich (deep comparison) von zwei Werten durch.
 * Gibt `true` zurück, wenn die Werte als gleich angesehen werden.
 *
 * @param valueA Der erste Wert für den Vergleich.
 * @param valueB Der zweite Wert für den Vergleich.
 * @returns {boolean} `true`, wenn die Werte gleich sind, andernfalls `false`.
 */
export const areObjectsEqual = (valueA: unknown, valueB: unknown): boolean => {
  console.log("areObjectsEqual", valueA, valueB);
  // 1. Schneller Check für exakt die gleiche Referenz oder primitive Gleichheit
  if (valueA === valueB) {
    return true;
  }

  // DEINE SONDERREGEL: Behandle `null` und einen leeren String `""` als gleichwertig.
  const areNullAndEmptyString =
    (valueA === null && valueB === "") || (valueA === "" && valueB === null);

  if (areNullAndEmptyString) {
    return true;
  }

  // 2. Nutzen der Type Guard: Wenn beide Werte keine Objekte sind,
  // und die vorherigen Checks fehlschlugen, sind sie ungleich.
  if (!isObject(valueA) || !isObject(valueB)) {
    console.log("areObjectsEqual no objects", valueA, valueB);
    return false;
  }

  // Ab hier weiß TypeScript dank der Type Guard, dass valueA und valueB Objekte sind.

  // 3. Holen der Schlüssel und Vergleich der Anzahl
  const keysA = Object.keys(valueA);
  const keysB = Object.keys(valueB);

  if (keysA.length !== keysB.length) {
    console.log("areObjectsEqual length");
    return false;
  }

  // 4. Iteration über alle Schlüssel und rekursiver Vergleich der Werte
  for (const key of keysA) {
    // Prüfen, ob der Schlüssel auch im zweiten Objekt überhaupt existiert
    if (!keysB.includes(key)) {
      console.log("areObjectsEqual keys");
      return false;
    }

    // Die Werte der Schlüssel sind wieder `unknown`, daher nutzen wir Rekursion.
    const nestedValueA = valueA[key];
    const nestedValueB = valueB[key];

    // Wenn der rekursive Aufruf für einen der Werte `false` zurückgibt,
    // sind die gesamten Objekte ungleich.
    if (!areObjectsEqual(nestedValueA, nestedValueB)) {
      console.log("areObjectsEqual nested");
      return false;
    }
  }

  // 5. Wenn die Schleife durchläuft, sind die Objekte gleich
  return true;
};
