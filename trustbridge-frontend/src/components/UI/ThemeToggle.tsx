import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-6 rounded-full transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 dark:bg-white/10 dark:border-2 dark:border-primary-blue dark:backdrop-blur-sm bg-gray-300 border-2 border-primary-blue"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
          theme === 'light' 
            ? 'translate-x-6 bg-primary-blue' 
            : 'translate-x-0 bg-primary-blue'
        }`}
      >
        {theme === 'light' ? (
          <Sun className="w-3 h-3 text-white" />
        ) : (
          <Moon className="w-3 h-3 text-white" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
