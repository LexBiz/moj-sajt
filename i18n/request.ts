import {getRequestConfig} from 'next-intl/server';

// Минимальный конфиг для next-intl, чтобы сборка не падала.
// В проекте локализация делается через локальные `translations.ts`,
// поэтому здесь возвращаем пустые messages.
export default getRequestConfig(async () => {
  return {
    messages: {}
  };
});


