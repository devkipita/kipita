import { useCallback } from 'react';
import { t, setLocale, Locale } from '@/lib/i18n';
import { usePreferencesStore } from '@/store/slices/preferences';

export function useLocale() {
  const locale = usePreferencesStore(s => s.locale);
  const setLocalePref = usePreferencesStore(s => s.setLocale);

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      setLocalePref(newLocale);
    },
    [setLocalePref],
  );

  return { locale, t, changeLocale };
}
