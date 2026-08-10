export type DateFormat = "locale" | "mdy" | "dmy" | "ymd";

export const DATE_FORMAT_COOKIE = "workspace_date_format";
export const DATE_FORMAT_STORAGE_KEY = "workspace_date_format";

const DATE_FORMAT_ORDER: DateFormat[] = ["locale", "mdy", "dmy", "ymd"];

export function parseDateFormat(value: string | undefined | null): DateFormat {
  if (value != null && DATE_FORMAT_ORDER.includes(value as DateFormat)) {
    return value as DateFormat;
  }
  return "locale";
}

/** Blocking script: copy localStorage date format into a cookie for the next SSR. */
export function dateFormatInitInlineScript(): string {
  const key = DATE_FORMAT_COOKIE;
  return `(function(){try{var k="${key}";var v=localStorage.getItem(k);if(v!=="locale"&&v!=="mdy"&&v!=="dmy"&&v!=="ymd")return;var has=document.cookie.split("; ").some(function(c){return c.indexOf(k+"=")==0});if(!has){document.cookie=k+"="+v+"; Path=/; Max-Age=31536000; SameSite=Lax"}}catch(e){}})();`;
}
