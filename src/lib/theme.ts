/**
 * Theme helpers — always prefer Tailwind theme classes in UI.
 * Use this only when you must pass computed colors (charts, print/PDF).
 */
export function getCssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** Brand + semantic colors resolved from global CSS variables */
export function getThemeColors() {
  return {
    brand25: getCssVar("--color-brand-25", "#fafafa"),
    brand50: getCssVar("--color-brand-50", "#f5f5f5"),
    brand100: getCssVar("--color-brand-100", "#e5e5e5"),
    brand200: getCssVar("--color-brand-200", "#d4d4d4"),
    brand300: getCssVar("--color-brand-300", "#a3a3a3"),
    brand400: getCssVar("--color-brand-400", "#737373"),
    brand500: getCssVar("--color-brand-500", "#171717"),
    brand600: getCssVar("--color-brand-600", "#0a0a0a"),
    brand700: getCssVar("--color-brand-700", "#000000"),
    brand800: getCssVar("--color-brand-800", "#000000"),
    brand900: getCssVar("--color-brand-900", "#000000"),
    gray50: getCssVar("--color-gray-50", "#fafafa"),
    gray100: getCssVar("--color-gray-100", "#f5f5f5"),
    gray200: getCssVar("--color-gray-200", "#e5e5e5"),
    gray300: getCssVar("--color-gray-300", "#d4d4d4"),
    gray400: getCssVar("--color-gray-400", "#a3a3a3"),
    gray500: getCssVar("--color-gray-500", "#737373"),
    gray700: getCssVar("--color-gray-700", "#404040"),
    gray800: getCssVar("--color-gray-800", "#262626"),
    gray900: getCssVar("--color-gray-900", "#171717"),
    success50: getCssVar("--color-success-50", "#ecfdf3"),
    success600: getCssVar("--color-success-600", "#039855"),
    error50: getCssVar("--color-error-50", "#fef3f2"),
    error600: getCssVar("--color-error-600", "#d92d20"),
    warning50: getCssVar("--color-warning-50", "#fffaeb"),
    warning600: getCssVar("--color-warning-600", "#dc6803"),
    white: getCssVar("--color-white", "#ffffff"),
  };
}
