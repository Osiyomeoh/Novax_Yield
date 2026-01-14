import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUseTranslation, getI18n } from '../utils/i18n-helpers';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const useTranslation = getUseTranslation();
  const { i18n: i18nFromHook } = useTranslation();
  const i18nInstance = getI18n();
  const [currentLanguage, setCurrentLanguage] = useState(
    (i18nInstance && i18nInstance.language) || 'en'
  );

  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  ];

  const changeLanguage = async (lang: string) => {
    try {
      const i18n = getI18n();
      if (i18n && i18n.changeLanguage) {
        await i18n.changeLanguage(lang);
        // Force re-render by updating state
        setCurrentLanguage(lang);
      } else {
        // Fallback: just update state and localStorage
        setCurrentLanguage(lang);
      }
      localStorage.setItem('i18nextLng', lang);
      
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = lang;
      
      // For RTL languages (Arabic)
      if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }
      
      // Force page reload if i18n is working to apply translations
      if (i18n && i18n.changeLanguage) {
        // Small delay to ensure state updates
        setTimeout(() => {
          window.dispatchEvent(new Event('languageChanged'));
        }, 100);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  useEffect(() => {
    // Set initial language and direction
    const i18n = getI18n();
    const lang = (i18n && i18n.language) || 'en';
    setCurrentLanguage(lang);
    document.documentElement.lang = lang;
    
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }

    // Listen for language changes
    if (i18n && i18n.on) {
      i18n.on('languageChanged', (lng: string) => {
        setCurrentLanguage(lng);
        document.documentElement.lang = lng;
        
        if (lng === 'ar') {
          document.documentElement.dir = 'rtl';
        } else {
          document.documentElement.dir = 'ltr';
        }
      });

      return () => {
        if (i18n && i18n.off) {
          i18n.off('languageChanged');
        }
      };
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        availableLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
