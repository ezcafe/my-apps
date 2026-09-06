import { babyEn, type BabyMessageKey } from "@/messages/baby/en";
import { babyVi } from "@/messages/baby/vi";

export type BabyLocale = "en" | "vi";

export const BABY_LOCALE_COOKIE = "baby_locale";
export const BABY_LOCALE_STORAGE_KEY = "baby_locale";

export type BabyLocaleDictionaries = Record<
  BabyLocale,
  Partial<Record<string, string>>
>;

const dictionaries: BabyLocaleDictionaries = {
  en: babyEn,
  vi: babyVi,
};

export function parseBabyLocale(value: string | undefined | null): BabyLocale {
  if (value === "vi" || value === "en") return value;
  return "en";
}

/** Blocking script: copy localStorage baby locale into a cookie for the next SSR. */
export function babyLocaleInitInlineScript(): string {
  const key = BABY_LOCALE_COOKIE;
  return `(function(){try{var k="${key}";var v=localStorage.getItem(k);if(v!=="en"&&v!=="vi")return;var has=document.cookie.split("; ").some(function(c){return c.indexOf(k+"=")==0});if(!has){document.cookie=k+"="+v+"; Path=/; Max-Age=31536000; SameSite=Lax"}}catch(e){}})();`;
}

export function babyLocaleFromCookieHeader(
  cookieHeader: string | null | undefined,
): BabyLocale {
  if (!cookieHeader) return "en";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BABY_LOCALE_COOKIE}=`));
  if (!match) return "en";
  return parseBabyLocale(match.slice(BABY_LOCALE_COOKIE.length + 1));
}

/** Pure lookup — tests pass a copy so shared maps stay untouched. */
export function lookupBabyMessage(
  key: string,
  locale: BabyLocale,
  dicts: BabyLocaleDictionaries,
): string {
  const fromLocale = dicts[locale]?.[key];
  if (fromLocale) return fromLocale;
  const fromEn = dicts.en?.[key];
  if (fromEn) return fromEn;
  return key;
}

export function t(
  key: string,
  locale: BabyLocale = "en",
): string {
  return lookupBabyMessage(key, locale, dictionaries);
}
