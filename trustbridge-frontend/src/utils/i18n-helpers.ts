import React from 'react';

// Import all translation files directly
import enTranslations from '../i18n/locales/en.json';
import esTranslations from '../i18n/locales/es.json';
import frTranslations from '../i18n/locales/fr.json';
import zhTranslations from '../i18n/locales/zh.json';
import arTranslations from '../i18n/locales/ar.json';
import ptTranslations from '../i18n/locales/pt.json';
import hiTranslations from '../i18n/locales/hi.json';
import jaTranslations from '../i18n/locales/ja.json';

// Helper functions for i18n that work even if dependencies aren't installed
let useTranslationHook: any = null;
let i18nInstance: any = null;

// Translation map - all languages loaded
const translationMap: Record<string, any> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  zh: zhTranslations,
  ar: arTranslations,
  pt: ptTranslations,
  hi: hiTranslations,
  ja: jaTranslations,
};

const loadTranslations = (lang: string) => {
  return translationMap[lang] || translationMap['en'] || {};
};

// Helper to get nested translation value
const getTranslationValue = (translations: any, key: string): string => {
  if (!translations || typeof translations !== 'object') {
    return key;
  }
  
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Key not found
    }
  }
  
  return typeof value === 'string' ? value : key;
};

export const getUseTranslation = () => {
  if (useTranslationHook) {
    return useTranslationHook;
  }
  
  try {
    const reactI18next = require('react-i18next');
    useTranslationHook = reactI18next.useTranslation;
    return useTranslationHook;
  } catch (e) {
    // Return fallback function that works without dependencies
    // Only warn once, not on every render
    if (!(window as any).__i18n_warned) {
      console.warn('⚠️ react-i18next not installed. Using fallback translations.');
      console.warn('⚠️ For full functionality, run: npm install i18next react-i18next i18next-browser-languagedetector');
      (window as any).__i18n_warned = true;
    }
    
    // Return a React hook that triggers re-renders and loads translations
    return () => {
      const [lang, setLang] = React.useState(localStorage.getItem('i18nextLng') || 'en');
      
      // Listen for language changes
      React.useEffect(() => {
        const handleLangChange = () => {
          const newLang = localStorage.getItem('i18nextLng') || 'en';
          if (newLang !== lang) {
            setLang(newLang);
          }
        };
        window.addEventListener('languageChanged', handleLangChange);
        // Also check periodically for changes
        const interval = setInterval(() => {
          const currentLang = localStorage.getItem('i18nextLng') || 'en';
          if (currentLang !== lang) {
            setLang(currentLang);
          }
        }, 200);
        
        return () => {
          window.removeEventListener('languageChanged', handleLangChange);
          clearInterval(interval);
        };
      }, [lang]);
      
      // Translation function that loads from JSON files
      const t = (key: string): string => {
        try {
          const currentLang = localStorage.getItem('i18nextLng') || 'en';
          const translations = loadTranslations(currentLang);
          
          // Try current language first
          let value = getTranslationValue(translations, key);
          if (value !== key) {
            return value;
          }
          
          // Fallback to English if not found
          if (currentLang !== 'en') {
            const enTranslations = loadTranslations('en');
            value = getTranslationValue(enTranslations, key);
          }
          
          return value;
        } catch (e) {
          console.error('Translation error for key:', key, e);
          return key;
        }
      };
      
      return { 
        t,
        i18n: {
          language: lang,
          changeLanguage: () => Promise.resolve(),
        }
      };
    };
  }
};

export const getI18n = () => {
  if (i18nInstance) {
    return i18nInstance;
  }
  
  try {
    // Try to get the initialized i18n instance from config
    const config = require('../i18n/config').default;
    if (config && config.language) {
      i18nInstance = config;
      return i18nInstance;
    }
    // Fallback to default export
    i18nInstance = require('i18next').default;
    return i18nInstance;
  } catch (e) {
    console.warn('⚠️ i18next not installed. Using fallback translation system.');
    return {
      language: localStorage.getItem('i18nextLng') || 'en',
      changeLanguage: (lang: string) => {
        localStorage.setItem('i18nextLng', lang);
        window.dispatchEvent(new Event('languageChanged'));
        return Promise.resolve();
      },
      on: () => {},
      off: () => {},
      t: (key: string): string => {
        try {
          const currentLang = localStorage.getItem('i18nextLng') || 'en';
          const translations = loadTranslations(currentLang);
          
          // Try current language first
          let value = getTranslationValue(translations, key);
          if (value !== key) {
            return value;
          }
          
          // Fallback to English if not found
          if (currentLang !== 'en') {
            const enTranslations = loadTranslations('en');
            value = getTranslationValue(enTranslations, key);
          }
          
          return value;
        } catch (e) {
          return key;
        }
      },
    };
  }
};
