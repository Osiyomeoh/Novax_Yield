import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getUseTranslation } from '../../utils/i18n-helpers';
import { cn } from '../../lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'button';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className,
  variant = 'dropdown' 
}) => {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const useTranslation = getUseTranslation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage) || availableLanguages[0];

  if (variant === 'button') {
    return (
      <div className={cn('relative', className)} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{currentLang.code.toUpperCase()}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center justify-between',
                    currentLanguage === lang.code && 'bg-gray-50 font-medium'
                  )}
                >
                  <span>{lang.code.toUpperCase()}</span>
                  {currentLanguage === lang.code && (
                    <Check className="w-4 h-4 text-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLang.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="py-1">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center justify-between',
                  currentLanguage === lang.code && 'bg-gray-50 font-medium'
                )}
              >
                <span>{lang.code.toUpperCase()}</span>
                {currentLanguage === lang.code && (
                  <Check className="w-4 h-4 text-black" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

