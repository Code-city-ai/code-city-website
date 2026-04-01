import React from 'react';

const ThemeContext = React.createContext({
  theme: 'dark',
  isDark: true,
});

export function ThemeProvider({ theme, children }) {
  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return React.useContext(ThemeContext);
}