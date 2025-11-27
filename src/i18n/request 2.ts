import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  const supported = ['en', 'es'];
  const l: 'en' | 'es' = supported.includes(String(locale)) ? (locale as 'en' | 'es') : 'en';
  const messages = (await import(`@/messages/${l}.json`)).default;
  return {locale: l, messages};
});
