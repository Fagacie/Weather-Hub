export const LANGUAGES = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'ms', label: 'Bahasa Melayu', rtl: false },
  { code: 'zh-CN', label: '中文', rtl: false },
  { code: 'ta', label: 'தமிழ்', rtl: false },
  { code: 'hi', label: 'हिन्दी', rtl: false }
];

const STORAGE_KEY = 'weatherhub:lang';
const DEFAULT_LANG = 'en';

export function isSupportedLanguage(code) {
  return LANGUAGES.some((lang) => lang.code === code);
}

export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function storeLanguage(code) {
  if (!isSupportedLanguage(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private browsing can block writes; the selection still applies for this page.
  }
}

/**
 * Arabic needs the whole document mirrored, not just translated text.
 */
export function applyDirection(code) {
  const language = LANGUAGES.find((lang) => lang.code === code);
  const dir = language?.rtl ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', code);
}
