// Conditional i18n setup - handles missing dependencies gracefully
let i18n: any;
let initReactI18next: any;
let LanguageDetector: any;

try {
  // Try to import i18n dependencies
  i18n = require('i18next').default;
  const reactI18next = require('react-i18next');
  initReactI18next = reactI18next.initReactI18next;
  LanguageDetector = require('i18next-browser-languagedetector').default;
} catch (e) {
  // Fallback if dependencies not installed
  console.warn('⚠️ i18n dependencies not installed. Please run: npm install i18next react-i18next i18next-browser-languagedetector');
  // Create a mock i18n object
  i18n = {
    use: () => i18n,
    init: () => {},
    language: 'en',
    changeLanguage: () => Promise.resolve(),
    on: () => {},
    off: () => {},
  };
  initReactI18next = () => {};
  LanguageDetector = () => {};
}

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import zhTranslations from './locales/zh.json';
import arTranslations from './locales/ar.json';
import ptTranslations from './locales/pt.json';
import hiTranslations from './locales/hi.json';
import jaTranslations from './locales/ja.json';

const resources = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
  zh: { translation: zhTranslations },
  ar: { translation: arTranslations },
  pt: { translation: ptTranslations },
  hi: { translation: hiTranslations },
  ja: { translation: jaTranslations },
};

// Only initialize if dependencies are available
if (i18n && i18n.use && LanguageDetector && initReactI18next) {
  i18n
    .use(LanguageDetector) // Detects user language
    .use(initReactI18next) // Passes i18n down to react-i18next
    .init({
      resources,
      fallbackLng: 'en', // Default language
      debug: false,
      
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      
      detection: {
        // Order of language detection
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'], // Cache user language preference
      },
    });
}

export default i18n;
