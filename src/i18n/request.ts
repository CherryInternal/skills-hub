import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import { defaultLocale, type Locale, locales } from "./config";

// Locale 判断(对齐 cherryin 原版):
//   1. cookie `locale`(用户手动选过的)优先
//   2. 否则看浏览器 Accept-Language(含 zh → 中文)
//   3. 默认 en
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  let locale: Locale = defaultLocale;

  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    const acceptLanguage = headersList.get("accept-language") ?? "";
    if (acceptLanguage.toLowerCase().includes("zh")) {
      locale = "zh";
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
