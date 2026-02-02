// 📁 frontend/src/hooks/useTranslation.ts
import translations from '../locales/uk.json';

type TranslationKeys = typeof translations;
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

export function useTranslation() {
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Replace parameters with multiple formats:
    // {{name}} - double curly braces
    // {name} - single curly braces  
    // #{name} - hash with curly braces
    if (params) {
      return value
        .replace(/\{\{(\w+)\}\}/g, (match: string, paramKey: string) => {
          return params[paramKey]?.toString() || match;
        })
        .replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
          return params[paramKey]?.toString() || match;
        })
        .replace(/\#\{(\w+)\}/g, (match: string, paramKey: string) => {
          return params[paramKey]?.toString() || match;
        });
    }

    return value;
  };

  return { t };
}

// Helper type for components
export type TranslationFunction = ReturnType<typeof useTranslation>['t'];