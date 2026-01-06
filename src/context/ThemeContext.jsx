import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState(false);

  // Apply theme immediately when themeMode changes
  useEffect(() => {
    let isDarkMode = false;

    if (themeMode === 'dark') {
      isDarkMode = true;
    } else if (themeMode === 'light') {
      isDarkMode = false;
    } else if (themeMode === 'system') {
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Update state
    setIsDark(isDarkMode);

    // Apply the theme to DOM - force update
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.remove('light');
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.classList.add('light');
    }
  }, [themeMode]);

  // Listen to system theme changes only when in system mode
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const isDarkMode = e.matches;
      setIsDark(isDarkMode);

      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const setTheme = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setTheme(newMode);
  };

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
