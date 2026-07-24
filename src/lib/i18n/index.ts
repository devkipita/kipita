import { en, TranslationKey } from './en';
import { sw } from './sw';

export type Locale = 'en' | 'sw';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, sw };

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey): string {
  return dictionaries[currentLocale][key] ?? dictionaries.en[key] ?? key;
}

export type { TranslationKey };
export { en, sw };
